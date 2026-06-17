import { NextResponse } from "next/server";

/** Lists in-app notifications (wired in a later task). */
export async function GET() {
  return NextResponse.json({ data: [] });
}
