/**
 * Blog Engine. Public reads (published only) + admin authoring.
 * Uses the service-role client; public functions explicitly filter to
 * published posts so nothing unpublished ever leaks.
 */
import { createAdminClient } from "@/lib/supabase/admin";

export type BlogCategory =
  | "insights"
  | "guides"
  | "product_spotlight"
  | "culture"
  | "case_study"
  | "seasonal"
  | "industry";

export type BlogStatus = "draft" | "published" | "scheduled" | "archived";

export type BlogCtaType =
  | "enquire"
  | "gift_builder"
  | "catalog"
  | "whatsapp"
  | "none";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  og_image_url: string | null;
  category: BlogCategory;
  tags: string[];
  meta_title: string | null;
  meta_description: string | null;
  keywords: string[] | null;
  canonical_url: string | null;
  status: BlogStatus;
  published_at: string | null;
  scheduled_for: string | null;
  author_name: string;
  author_role: string;
  author_avatar_url: string | null;
  read_time_minutes: number;
  view_count: number;
  related_product_skus: string[] | null;
  related_collection_codes: string[] | null;
  cta_type: BlogCtaType;
  cta_text: string | null;
  cta_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogPostInput {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  heroImageUrl?: string;
  heroImageAlt?: string;
  ogImageUrl?: string;
  category: BlogCategory;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  canonicalUrl?: string;
  status?: BlogStatus;
  publishedAt?: string | null;
  scheduledFor?: string | null;
  authorName?: string;
  authorRole?: string;
  readTimeMinutes?: number;
  relatedProductSkus?: string[];
  relatedCollectionCodes?: string[];
  ctaType?: BlogCtaType;
  ctaText?: string;
  ctaUrl?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapPost(row: any): BlogPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    hero_image_url: row.hero_image_url ?? null,
    hero_image_alt: row.hero_image_alt ?? null,
    og_image_url: row.og_image_url ?? null,
    category: row.category,
    tags: row.tags ?? [],
    meta_title: row.meta_title ?? null,
    meta_description: row.meta_description ?? null,
    keywords: row.keywords ?? null,
    canonical_url: row.canonical_url ?? null,
    status: row.status,
    published_at: row.published_at ?? null,
    scheduled_for: row.scheduled_for ?? null,
    author_name: row.author_name ?? "Neon Visuals",
    author_role: row.author_role ?? "Gifting Experts",
    author_avatar_url: row.author_avatar_url ?? null,
    read_time_minutes: Number(row.read_time_minutes ?? 5),
    view_count: Number(row.view_count ?? 0),
    related_product_skus: row.related_product_skus ?? null,
    related_collection_codes: row.related_collection_codes ?? null,
    cta_type: row.cta_type ?? "enquire",
    cta_text: row.cta_text ?? null,
    cta_url: row.cta_url ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function estimateReadTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

// Card-sized projection (no full content) for listings.
const LIST_COLUMNS =
  "id, title, slug, excerpt, hero_image_url, hero_image_alt, og_image_url, category, tags, status, published_at, scheduled_for, author_name, author_role, read_time_minutes, view_count, cta_type, created_at, updated_at, related_product_skus, related_collection_codes, meta_title, meta_description, keywords, canonical_url, author_avatar_url, cta_text, cta_url, content";

// ---------------------------------------------------------------------------
// Public reads
// ---------------------------------------------------------------------------

export interface GetPublishedOptions {
  category?: string;
  tag?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getPublishedPosts(
  options: GetPublishedOptions = {},
): Promise<{ posts: BlogPost[]; total: number }> {
  const { page = 1, pageSize = 12 } = options;
  const supa = createAdminClient();
  let query = supa
    .from("blog_posts")
    .select(LIST_COLUMNS, { count: "exact" })
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  if (options.category && options.category !== "all")
    query = query.eq("category", options.category);
  if (options.tag) query = query.contains("tags", [options.tag]);
  if (options.search) {
    const term = options.search.replace(/[%,]/g, " ").trim();
    query = query.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%`);
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(`Get posts failed: ${error.message}`);
  return { posts: (data ?? []).map(mapPost), total: count ?? 0 };
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const supa = createAdminClient();
  const { data, error } = await supa
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error(`Get post failed: ${error.message}`);
  if (!data) return null;

  // Best-effort view increment.
  await supa
    .from("blog_posts")
    .update({ view_count: Number(data.view_count ?? 0) + 1 })
    .eq("id", data.id);

  return mapPost(data);
}

/** For admin preview of drafts (bypasses the published filter). */
export async function getPostBySlugAnyStatus(
  slug: string,
): Promise<BlogPost | null> {
  const supa = createAdminClient();
  const { data, error } = await supa
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Get post failed: ${error.message}`);
  return data ? mapPost(data) : null;
}

export async function getPostById(id: string): Promise<BlogPost | null> {
  const supa = createAdminClient();
  const { data, error } = await supa
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Get post failed: ${error.message}`);
  return data ? mapPost(data) : null;
}

export async function getRelatedPosts(
  postId: string,
  limit = 3,
): Promise<BlogPost[]> {
  const supa = createAdminClient();
  const current = await getPostById(postId);
  if (!current) return [];

  const { data } = await supa
    .from("blog_posts")
    .select(LIST_COLUMNS)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .neq("id", postId)
    .order("published_at", { ascending: false })
    .limit(24);

  const posts = (data ?? []).map(mapPost);
  // Score by shared category + overlapping tags.
  const scored = posts
    .map((p) => {
      let score = p.category === current.category ? 2 : 0;
      score += p.tags.filter((t) => current.tags.includes(t)).length;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score);

  const ranked = scored.filter((s) => s.score > 0).map((s) => s.p);
  const fallback = scored.map((s) => s.p);
  return (ranked.length >= limit ? ranked : fallback).slice(0, limit);
}

export async function getRecentPosts(limit = 3): Promise<BlogPost[]> {
  const { posts } = await getPublishedPosts({ pageSize: limit });
  return posts;
}

export async function getCategories(): Promise<
  Array<{ category: string; count: number }>
> {
  const supa = createAdminClient();
  const { data } = await supa
    .from("blog_posts")
    .select("category")
    .eq("status", "published");
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const c = row.category as string;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getPopularTags(): Promise<
  Array<{ tag: string; count: number }>
> {
  const supa = createAdminClient();
  const { data } = await supa
    .from("blog_posts")
    .select("tags")
    .eq("status", "published");
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    for (const t of (row.tags as string[] | null) ?? []) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

// ---------------------------------------------------------------------------
// Admin authoring
// ---------------------------------------------------------------------------

function buildPayload(input: Partial<BlogPostInput>): Record<string, unknown> {
  const map: Record<string, string> = {
    title: "title",
    slug: "slug",
    excerpt: "excerpt",
    content: "content",
    heroImageUrl: "hero_image_url",
    heroImageAlt: "hero_image_alt",
    ogImageUrl: "og_image_url",
    category: "category",
    tags: "tags",
    metaTitle: "meta_title",
    metaDescription: "meta_description",
    keywords: "keywords",
    canonicalUrl: "canonical_url",
    status: "status",
    publishedAt: "published_at",
    scheduledFor: "scheduled_for",
    authorName: "author_name",
    authorRole: "author_role",
    readTimeMinutes: "read_time_minutes",
    relatedProductSkus: "related_product_skus",
    relatedCollectionCodes: "related_collection_codes",
    ctaType: "cta_type",
    ctaText: "cta_text",
    ctaUrl: "cta_url",
  };
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const col = map[key];
    if (col && value !== undefined) payload[col] = value === "" ? null : value;
  }
  return payload;
}

export async function createPost(
  input: BlogPostInput,
  createdBy?: string,
): Promise<BlogPost> {
  const supa = createAdminClient();
  const slug = input.slug?.trim() || slugify(input.title);
  const status = input.status ?? "draft";
  const payload = {
    ...buildPayload(input),
    slug,
    read_time_minutes: input.readTimeMinutes ?? estimateReadTime(input.content),
    published_at:
      input.publishedAt ??
      (status === "published" ? new Date().toISOString() : null),
    created_by: createdBy ?? null,
  };
  const { data, error } = await supa
    .from("blog_posts")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(`Create post failed: ${error.message}`);
  return mapPost(data);
}

export async function updatePost(
  id: string,
  updates: Partial<BlogPostInput>,
): Promise<BlogPost> {
  const supa = createAdminClient();
  const payload = buildPayload(updates);
  // When transitioning to published without an explicit date, stamp it.
  if (updates.status === "published" && updates.publishedAt === undefined) {
    const existing = await getPostById(id);
    if (existing && !existing.published_at) {
      payload.published_at = new Date().toISOString();
    }
  }
  if (Object.keys(payload).length > 0) {
    const { error } = await supa.from("blog_posts").update(payload).eq("id", id);
    if (error) throw new Error(`Update post failed: ${error.message}`);
  }
  const post = await getPostById(id);
  if (!post) throw new Error("Post not found");
  return post;
}

export async function deletePost(id: string): Promise<void> {
  const supa = createAdminClient();
  const { error } = await supa
    .from("blog_posts")
    .update({ status: "archived" })
    .eq("id", id);
  if (error) throw new Error(`Archive post failed: ${error.message}`);
}

export async function listAllPosts(
  options: { status?: string } = {},
): Promise<{ posts: BlogPost[]; total: number }> {
  const supa = createAdminClient();
  let query = supa
    .from("blog_posts")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false });
  if (options.status && options.status !== "all")
    query = query.eq("status", options.status);
  const { data, count, error } = await query;
  if (error) throw new Error(`List posts failed: ${error.message}`);
  return { posts: (data ?? []).map(mapPost), total: count ?? 0 };
}

export interface BlogAdminStats {
  total: number;
  published: number;
  drafts: number;
  totalViews: number;
}

export async function getBlogStats(): Promise<BlogAdminStats> {
  const supa = createAdminClient();
  const { data } = await supa.from("blog_posts").select("status, view_count");
  const rows = data ?? [];
  return {
    total: rows.length,
    published: rows.filter((r) => r.status === "published").length,
    drafts: rows.filter((r) => r.status === "draft").length,
    totalViews: rows.reduce((s, r) => s + Number(r.view_count ?? 0), 0),
  };
}

/** Published post slugs + last-modified, for the XML sitemap. */
export async function getBlogSlugsForSitemap(): Promise<
  Array<{ slug: string; updatedAt: Date }>
> {
  try {
    const supa = createAdminClient();
    const { data } = await supa
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString());
    return (data ?? []).map((p) => ({
      slug: p.slug as string,
      updatedAt: new Date((p.updated_at as string) ?? (p.published_at as string) ?? Date.now()),
    }));
  } catch {
    return [];
  }
}
