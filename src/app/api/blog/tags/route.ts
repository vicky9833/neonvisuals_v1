import { NextResponse } from "next/server";
import { getPopularTags } from "@/lib/engines/blog";

export const runtime = "nodejs";

export async function GET() {
  try {
    const tags = await getPopularTags();
    return NextResponse.json({ data: tags });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "tags_failed", message }, { status: 500 });
  }
}
