import { NextResponse } from "next/server";

/** Lists invoices (wired in a later task). */
export async function GET() {
  return NextResponse.json({ data: [] });
}

/** Generates an invoice (not implemented yet). */
export async function POST() {
  return NextResponse.json(
    { error: "not_implemented", message: "Invoice generation is coming soon." },
    { status: 501 },
  );
}
