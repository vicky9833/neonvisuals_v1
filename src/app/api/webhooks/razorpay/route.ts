import { NextResponse } from "next/server";

/**
 * Razorpay webhook receiver. Signature verification and event handling are
 * wired in a later task; acknowledges receipt for now.
 */
export async function POST() {
  return NextResponse.json({ received: true });
}
