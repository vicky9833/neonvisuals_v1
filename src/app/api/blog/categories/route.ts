import { NextResponse } from "next/server";
import { getCategories } from "@/lib/engines/blog";

export const runtime = "nodejs";

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json({ data: categories });
  } catch (err) {
    console.error("[blog/categories]", err);
    return NextResponse.json(
      { error: "categories_failed", message: "Failed to load categories." },
      { status: 500 },
    );
  }
}
