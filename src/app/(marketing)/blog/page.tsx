import type { Metadata } from "next";
import { buildMetadata, blogJsonLd } from "@/lib/utils/seo";
import { getPublishedPosts } from "@/lib/engines/blog";
import { BlogGrid } from "@/components/blog/BlogGrid";

export const metadata: Metadata = buildMetadata({
  title: "Corporate Gifting Blog - Insights & Guides | Neon Visuals",
  description:
    "Expert insights on corporate gifting, employee recognition, and building workplace culture. Guides, tips, and stories from Bangalore's premium gifting studio.",
  path: "/blog",
});

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const { posts, total } = await getPublishedPosts({ pageSize: 12 });
  const jsonLd = blogJsonLd(
    posts.slice(0, 10).map((p) => ({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      datePublished: p.published_at,
    })),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-navy sm:text-4xl">
          The Neon Visuals Journal
        </h1>
        <p className="mt-4 text-lg text-[#6B7280]">
          Insights, guides, and stories about building a culture of recognition.
        </p>
      </header>

      <div className="mt-12">
        <BlogGrid initialPosts={posts} initialTotal={total} />
      </div>
    </div>
  );
}
