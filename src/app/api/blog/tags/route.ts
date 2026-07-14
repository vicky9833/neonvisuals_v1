import { NextResponse } from "next/server";
import { getPopularTags } from "@/lib/engines/blog";

export const runtime = "nodejs";

export async function GET() {
  try {
    const tags = await getPopularTags();
    return NextResponse.json({ data: tags });
  } catch (err) {
    console.error("[blog/tags]", err);
    return NextResponse.json(
      { error: "tags_failed", message: "Failed to load tags." },
      { status: 500 },
    );
  }
}
