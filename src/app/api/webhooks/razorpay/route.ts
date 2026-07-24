import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/services/razorpay";
import { handleRazorpayWebhook } from "@/lib/engines/billing";
import { activateSubscriptionFromWebhook } from "@/lib/engines/subscription";
import { notifyPaymentFailed } from "@/lib/engines/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, clientIp } from "@/lib/services/rate-limit";

export const runtime = "nodejs";

// DoS guard: generous per-IP ceiling so legitimate Razorpay bursts/retries pass, but a flood is
// bounded before signature work. Fail-open (limiter error never drops a real webhook).
const WEBHOOK_RL_WINDOW_SECONDS = 60;
const WEBHOOK_RL_MAX = 300;

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
    const { limited } = await checkRateLimit({
      bucket: "razorpay_webhook",
      identifier: clientIp(request),
      windowSeconds: WEBHOOK_RL_WINDOW_SECONDS,
      max: WEBHOOK_RL_MAX,
    });
    if (limited) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

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
    // Phase 6 Task 4: the amount Razorpay actually CAPTURED, in paise, from the (already
    // signature-verified) payload. Passed to the engine for amount verification; when absent the
    // engine invoices the expected amount. Field: payload.payment.entity.amount.
    const capturedAmountPaise: number | null =
      typeof paymentEntity?.amount === "number" ? paymentEntity.amount : null;
    if (razorpayOrderId) {
      await activateSubscriptionFromWebhook(admin, {
        razorpayOrderId,
        razorpayPaymentId,
        capturedAmountPaise,
      });
    }
    return;
  }

  // payment.failed (§8c-i): INFORMATIONAL ONLY — notify billing contacts, NEVER change plan_status
  // (the annual model lapses via the cron, not a failed webhook). Resolve the company via order id.
  if (eventType === "payment.failed") {
    const paymentEntity = p?.payload?.payment?.entity;
    const razorpayOrderId: string = paymentEntity?.order_id ?? "";
    if (razorpayOrderId) {
      const { data: sub } = await admin
        .from("subscriptions")
        .select("company_id")
        .eq("razorpay_order_id", razorpayOrderId)
        .maybeSingle();
      const companyId = (sub as { company_id?: string } | null)?.company_id;
      if (companyId) {
        await notifyPaymentFailed(admin, { companyId, eventId: paymentEntity?.id ?? null });
      }
    }
    return;
  }

  // subscription.halted / subscription.cancelled (§8c-i): handle-if-present, but the annual
  // one-time model does NOT depend on them (the billing cron is authoritative for lapse). Safe
  // acknowledged no-op — never downgrades from a webhook we don't rely on.
  if (eventType === "subscription.halted" || eventType === "subscription.cancelled") {
    console.warn(`[webhooks/razorpay] ${eventType} acknowledged (no-op; cron authoritative)`);
    return;
  }

  // Existing invoice payment-link flow (unchanged).
  if (eventType === "payment_link.paid") {
    await handleRazorpayWebhook(p);
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
