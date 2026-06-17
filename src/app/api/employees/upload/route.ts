import { NextResponse } from "next/server";

/** Bulk employee CSV import (not implemented yet). */
export async function POST() {
  return NextResponse.json(
    { error: "not_implemented", message: "CSV import is coming soon." },
    { status: 501 },
  );
}
