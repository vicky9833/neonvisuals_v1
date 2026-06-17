import { NextResponse } from "next/server";

/** Creates a Razorpay order (not implemented yet). */
export async function POST() {
  return NextResponse.json(
    { error: "not_implemented", message: "Payments are coming soon." },
    { status: 501 },
  );
}
