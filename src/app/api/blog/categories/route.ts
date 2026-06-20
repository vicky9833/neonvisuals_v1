import { NextResponse } from "next/server";
import { getCategories } from "@/lib/engines/blog";

export const runtime = "nodejs";

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json({ data: categories });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "categories_failed", message }, { status: 500 });
  }
}
