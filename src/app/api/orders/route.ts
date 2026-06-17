import { NextResponse } from "next/server";

/** Lists orders for the active organization (wired in a later task). */
export async function GET() {
  return NextResponse.json({ data: [] });
}

/** Creates an order (not implemented yet). */
export async function POST() {
  return NextResponse.json(
    { error: "not_implemented", message: "Order creation is coming soon." },
    { status: 501 },
  );
}
