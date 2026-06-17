import { NextResponse } from "next/server";

/** Lists blog posts (wired in a later task). */
export async function GET() {
  return NextResponse.json({ data: [] });
}

/** Creates a blog post (not implemented yet). */
export async function POST() {
  return NextResponse.json(
    { error: "not_implemented", message: "Blog authoring is coming soon." },
    { status: 501 },
  );
}
