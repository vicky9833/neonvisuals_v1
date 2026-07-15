import crypto from "node:crypto";
import Razorpay from "razorpay";

/**
 * Razorpay integration. Server-only - never import into client components.
 * Instantiated lazily so missing env vars don't break module load.
 *
 * Graceful degradation: when RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are empty,
 * `isRazorpayConfigured()` returns false and callers hide payment-link UI and
 * skip link creation - no errors are thrown.
 */
let client: Razorpay | null = null;

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpay(): Razorpay {
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return client;
}

export interface CreatePaymentLinkParams {
  /** Amount in paise (₹1 = 100 paise). */
  amount: number;
  currency?: "INR";
  description: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  invoiceNumber: string;
  callbackUrl: string;
}

export interface PaymentLinkResult {
  id: string;
  short_url: string;
}

/**
 * Creates a Razorpay payment link. Throws if Razorpay isn't configured - the
 * caller should guard with `isRazorpayConfigured()` first.
 */
export async function createPaymentLink(
  params: CreatePaymentLinkParams,
): Promise<PaymentLinkResult> {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay is not configured.");
  }
  const rzp = getRazorpay();
  const link = await rzp.paymentLink.create({
    amount: Math.round(params.amount),
    currency: params.currency ?? "INR",
    accept_partial: false,
    description: params.description,
    customer: {
      name: params.customerName,
      email: params.customerEmail || undefined,
      contact: params.customerPhone || undefined,
    },
    notify: { sms: Boolean(params.customerPhone), email: Boolean(params.customerEmail) },
    reminder_enable: true,
    notes: { invoice_number: params.invoiceNumber },
    callback_url: params.callbackUrl,
    callback_method: "get",
  });
  return { id: String(link.id), short_url: String(link.short_url) };
}

/**
 * Verifies a Razorpay webhook signature (HMAC SHA256 of the raw body).
 * Uses RAZORPAY_WEBHOOK_SECRET, falling back to RAZORPAY_KEY_SECRET.
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret?: string,
): boolean {
  const key =
    secret ||
    process.env.RAZORPAY_WEBHOOK_SECRET ||
    process.env.RAZORPAY_KEY_SECRET;
  if (!key || !signature) return false;
  const expected = crypto
    .createHmac("sha256", key)
    .update(body)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}
