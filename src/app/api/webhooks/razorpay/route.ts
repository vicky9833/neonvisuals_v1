import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/services/razorpay";
import { handleRazorpayWebhook } from "@/lib/engines/billing";

export const runtime = "nodejs";

/**
 * Razorpay webhook receiver. PUBLIC (no auth) but signature-verified using
 * RAZORPAY_WEBHOOK_SECRET (falling back to RAZORPAY_KEY_SECRET). Acknowledges
 * quickly; event processing is best-effort.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json(
      { error: "invalid_signature" },
      { status: 400 },
    );
  }

  // Acknowledge immediately; process without blocking the 200.
  try {
    const payload = JSON.parse(raw);
    await handleRazorpayWebhook(payload);
  } catch {
    // Swallow — Razorpay retries failed deliveries; never 500 on parse issues.
  }

  return NextResponse.json({ received: true });
}
