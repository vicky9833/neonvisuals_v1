import Razorpay from "razorpay";

/**
 * Razorpay integration. Server-only — never import into client components.
 * Instantiated lazily so missing env vars don't break module load.
 */
let client: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return client;
}
