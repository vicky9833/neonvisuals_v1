import type { MetadataRoute } from "next";
import { PRODUCTS, BUCKETS } from "@/lib/catalog";
import { OCCASIONS } from "@/data/occasions";
import { getBlogSlugsForSitemap } from "@/lib/engines/blog";

const BASE_URL = "https://neonvisuals.in";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1.0, lastModified: now },
    { url: `${BASE_URL}/products`, changeFrequency: "weekly", priority: 0.9, lastModified: now },
    { url: `${BASE_URL}/collections`, changeFrequency: "weekly", priority: 0.9, lastModified: now },
    { url: `${BASE_URL}/occasions`, changeFrequency: "weekly", priority: 0.8, lastModified: now },
    { url: `${BASE_URL}/gift-builder`, changeFrequency: "monthly", priority: 0.8, lastModified: now },
    { url: `${BASE_URL}/blog`, changeFrequency: "daily", priority: 0.8, lastModified: now },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.5, lastModified: now },
    { url: `${BASE_URL}/contact`, changeFrequency: "monthly", priority: 0.5, lastModified: now },
    { url: `${BASE_URL}/how-it-works`, changeFrequency: "monthly", priority: 0.6, lastModified: now },
    { url: `${BASE_URL}/pricing`, changeFrequency: "monthly", priority: 0.5, lastModified: now },
    { url: `${BASE_URL}/get-quote`, changeFrequency: "monthly", priority: 0.6, lastModified: now },
  ];

  const productPages: MetadataRoute.Sitemap = PRODUCTS.map((p) => ({
    url: `${BASE_URL}/products/${p.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
    lastModified: now,
  }));

  const collectionPages: MetadataRoute.Sitemap = BUCKETS.map((b) => ({
    url: `${BASE_URL}/collections/${b.slug}`,
    changeFrequency: "monthly",
    priority: 0.8,
    lastModified: now,
  }));

  const occasionPages: MetadataRoute.Sitemap = OCCASIONS.map((o) => ({
    url: `${BASE_URL}/occasions/${o.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
    lastModified: now,
  }));

  const blogSlugs = await getBlogSlugsForSitemap();
  const blogPages: MetadataRoute.Sitemap = blogSlugs.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
    lastModified: post.updatedAt,
  }));

  return [
    ...staticPages,
    ...productPages,
    ...collectionPages,
    ...occasionPages,
    ...blogPages,
  ];
}
