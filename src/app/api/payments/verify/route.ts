import { NextResponse } from "next/server";

/** Verifies a Razorpay payment signature (not implemented yet). */
export async function POST() {
  return NextResponse.json(
    { error: "not_implemented", message: "Payment verification is coming soon." },
    { status: 501 },
  );
}
