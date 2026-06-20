import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import { createPost, getPublishedPosts } from "@/lib/engines/blog";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  excerpt: z.string().min(1),
  content: z.string().min(1),
  heroImageUrl: z.string().optional(),
  heroImageAlt: z.string().optional(),
  ogImageUrl: z.string().optional(),
  category: z.enum([
    "insights",
    "guides",
    "product_spotlight",
    "culture",
    "case_study",
    "seasonal",
    "industry",
  ]),
  tags: z.array(z.string()).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  canonicalUrl: z.string().optional(),
  status: z.enum(["draft", "published", "scheduled", "archived"]).optional(),
  publishedAt: z.string().nullable().optional(),
  scheduledFor: z.string().nullable().optional(),
  authorName: z.string().optional(),
  authorRole: z.string().optional(),
  readTimeMinutes: z.number().int().optional(),
  relatedProductSkus: z.array(z.string()).optional(),
  relatedCollectionCodes: z.array(z.string()).optional(),
  ctaType: z.enum(["enquire", "gift_builder", "catalog", "whatsapp", "none"]).optional(),
  ctaText: z.string().optional(),
  ctaUrl: z.string().optional(),
});

// GET — public list of published posts.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await getPublishedPosts({
      category: searchParams.get("category") ?? undefined,
      tag: searchParams.get("tag") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      pageSize: searchParams.get("pageSize")
        ? Number(searchParams.get("pageSize"))
        : undefined,
    });
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "list_failed", message }, { status: 500 });
  }
}

// POST — create a post (super_admin only).
export async function POST(request: Request) {
  try {
    const profile = await requireApiRole(["super_admin"]);
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    const post = await createPost(parsed.data, profile.id);
    return NextResponse.json({ data: post }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "create_failed", message }, { status: 500 });
  }
}
