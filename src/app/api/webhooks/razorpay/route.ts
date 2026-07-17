import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/services/razorpay";
import { handleRazorpayWebhook } from "@/lib/engines/billing";
import { activateSubscriptionFromWebhook } from "@/lib/engines/subscription";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Razorpay webhook receiver — THE INTEGRITY BOUNDARY.
 *
 * PUBLIC (no user session): `/api/*` bypasses the page allowlist, so this route
 * self-gates. It is authenticated by SIGNATURE, not session.
 *
 * (1) SIGNATURE: every payload's `x-razorpay-signature` is HMAC-verified against
 *     RAZORPAY_WEBHOOK_SECRET on the RAW body. Invalid/missing signature ->
 *     REJECT 401, no processing. This is the ONLY thing separating real Razorpay
 *     from a forger — without it, anyone who finds this URL forges "paid" and
 *     gets free Pro.
 * (2) IDEMPOTENCY: each event is processed at most once, keyed on Razorpay's
 *     unique event id (`x-razorpay-event-id`). A first-seen id is INSERTed into
 *     `razorpay_events`; a re-delivered/concurrent duplicate hits the PK unique
 *     constraint (23505) and is acked WITHOUT re-processing. Concurrent retries
 *     can never both win -> no double-activation.
 */
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";

    // (1) Signature gate — reject before any processing. 401 = not authenticated.
    if (!verifyWebhookSignature(raw, signature)) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }

    const admin = createAdminClient();

    // (2) Event-id idempotency guard. Absence of the id => cannot dedupe safely;
    //     synthesize a stable-enough fallback so at minimum a byte-identical
    //     re-delivery is still caught.
    const eventId =
      request.headers.get("x-razorpay-event-id") ?? `nohdr_${signature}`;

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      // Malformed body but valid signature — ack so Razorpay stops retrying.
      return NextResponse.json({ received: true, ignored: "unparseable" });
    }

    const eventType =
      typeof payload === "object" && payload !== null && "event" in payload
        ? String((payload as { event?: unknown }).event ?? "")
        : "";

    // Claim the event id. If it already exists (23505) this is a duplicate.
    const { error: claimErr } = await admin
      .from("razorpay_events")
      .insert({ event_id: eventId, event_type: eventType });
    if (claimErr) {
      if (claimErr.code === "23505") {
        // Already processed (re-delivery / concurrent) — ack, do NOT re-process.
        return NextResponse.json({ received: true, deduped: true });
      }
      // Guard write failed for another reason — do not risk a double-activate.
      console.error("[webhooks/razorpay] event guard insert failed");
      return NextResponse.json(
        { error: "server_error", message: "Webhook processing failed." },
        { status: 500 },
      );
    }

    // First delivery of this event id — process exactly once.
    try {
      await dispatch(payload, eventType, admin);
    } catch (procErr) {
      // Processing failed AFTER claiming the id. Release the claim so Razorpay's
      // retry can re-attempt (still exactly-once on the eventual success).
      await admin.from("razorpay_events").delete().eq("event_id", eventId);
      console.error("[webhooks/razorpay] processing failed", procErr);
      return NextResponse.json(
        { error: "server_error", message: "Webhook processing failed." },
        { status: 500 },
      );
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhooks/razorpay]", err);
    return NextResponse.json(
      { error: "server_error", message: "Webhook processing failed." },
      { status: 500 },
    );
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Routes a verified, de-duplicated event to its handler. Subscription
 * activation (`order.paid` / `payment.captured`) resolves the subscription by
 * its Razorpay order id; invoice payment links keep the existing billing path.
 */
async function dispatch(
  payload: unknown,
  eventType: string,
  admin: ReturnType<typeof createAdminClient>,
): Promise<void> {
  const p = payload as any;

  if (eventType === "order.paid" || eventType === "payment.captured") {
    const paymentEntity = p?.payload?.payment?.entity;
    const orderEntity = p?.payload?.order?.entity;
    const razorpayOrderId: string =
      orderEntity?.id ?? paymentEntity?.order_id ?? "";
    const razorpayPaymentId: string | null = paymentEntity?.id ?? null;
    if (razorpayOrderId) {
      await activateSubscriptionFromWebhook(admin, {
        razorpayOrderId,
        razorpayPaymentId,
      });
    }
    return;
  }

  // Existing invoice payment-link flow (unchanged).
  if (eventType === "payment_link.paid") {
    await handleRazorpayWebhook(p);
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
