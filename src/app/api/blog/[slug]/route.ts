import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import {
  deletePost,
  getPostById,
  getPostBySlug,
  getPostBySlugAnyStatus,
  updatePost,
} from "@/lib/engines/blog";

export const runtime = "nodejs";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  heroImageUrl: z.string().optional(),
  heroImageAlt: z.string().optional(),
  ogImageUrl: z.string().optional(),
  category: z
    .enum([
      "insights",
      "guides",
      "product_spotlight",
      "culture",
      "case_study",
      "seasonal",
      "industry",
    ])
    .optional(),
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

/** Resolve a route param that may be a post id (admin) or a slug. */
async function resolveId(param: string): Promise<string | null> {
  const byId = await getPostById(param).catch(() => null);
  if (byId) return byId.id;
  const bySlug = await getPostBySlugAnyStatus(param).catch(() => null);
  return bySlug?.id ?? null;
}

// GET — public, published post by slug.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const post = await getPostBySlug(slug);
    if (!post) {
      return NextResponse.json(
        { error: "not_found", message: "Post not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: post });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "get_failed", message }, { status: 500 });
  }
}

// PATCH — update post (super_admin). Param may be id or slug.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await requireApiRole(["super_admin"]);
    const { slug } = await params;
    const id = await resolveId(slug);
    if (!id) {
      return NextResponse.json(
        { error: "not_found", message: "Post not found" },
        { status: 404 },
      );
    }
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    const post = await updatePost(id, parsed.data);
    return NextResponse.json({ data: post });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "update_failed", message }, { status: 500 });
  }
}

// DELETE — archive post (super_admin). Param may be id or slug.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await requireApiRole(["super_admin"]);
    const { slug } = await params;
    const id = await resolveId(slug);
    if (!id) {
      return NextResponse.json(
        { error: "not_found", message: "Post not found" },
        { status: 404 },
      );
    }
    await deletePost(id);
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "delete_failed", message }, { status: 500 });
  }
}
