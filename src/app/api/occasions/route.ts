import { NextResponse } from "next/server";
import { OCCASIONS } from "@/data/occasions";

/** Returns occasion-first navigation entries. */
export async function GET() {
  return NextResponse.json({ data: OCCASIONS });
}
