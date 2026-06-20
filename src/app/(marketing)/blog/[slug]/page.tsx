import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  buildMetadata,
} from "@/lib/utils/seo";
import {
  getPostBySlug,
  getPostBySlugAnyStatus,
  getRelatedPosts,
} from "@/lib/engines/blog";
import { getProductBySku } from "@/lib/catalog";
import { formatDate } from "@/lib/utils/format";
import { BlogContent } from "@/components/blog/BlogContent";
import { BlogCTA } from "@/components/blog/BlogCTA";
import { BlogTags } from "@/components/blog/BlogTags";
import { BlogShare } from "@/components/blog/BlogShare";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
import { ProductCard } from "@/components/products/product-card";
import { CATEGORY_LABEL } from "@/components/blog/blog-meta";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlugAnyStatus(slug);
  if (!post) {
    return buildMetadata({ title: "Article", description: "", path: `/blog/${slug}` });
  }
  const md = buildMetadata({
    title: `${post.meta_title ?? post.title} | Neon Visuals Journal`,
    description: post.meta_description ?? post.excerpt,
    path: `/blog/${post.slug}`,
    image: post.og_image_url ?? post.hero_image_url ?? undefined,
    keywords: post.keywords ?? post.tags,
  });
  md.openGraph = { ...md.openGraph, type: "article" };
  if (post.canonical_url) {
    md.alternates = { canonical: post.canonical_url };
  }
  return md;
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const related = await getRelatedPosts(post.id, 3);
  const relatedProducts = (post.related_product_skus ?? [])
    .map((sku) => getProductBySku(sku))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 4);

  const date = post.published_at ?? post.created_at;

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Journal", url: "/blog" },
      { name: post.title, url: `/blog/${post.slug}` },
    ]),
    articleJsonLd({
      title: post.title,
      description: post.meta_description ?? post.excerpt,
      slug: post.slug,
      image: post.hero_image_url ?? undefined,
      datePublished: post.published_at,
      dateModified: post.updated_at,
      authorName: post.author_name,
      keywords: post.keywords ?? post.tags,
    }),
  ];

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1 text-xs text-[#9CA3AF]">
        <Link href="/" className="hover:text-navy">Home</Link>
        <ChevronRight className="size-3" />
        <Link href="/blog" className="hover:text-navy">Journal</Link>
        <ChevronRight className="size-3" />
        <span className="text-[#6B7280]">{CATEGORY_LABEL[post.category]}</span>
      </nav>

      {/* Header */}
      <header className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-gold">
          {CATEGORY_LABEL[post.category]} · {post.read_time_minutes} min read
          {date ? ` · ${formatDate(date)}` : ""}
        </p>
        <h1 className="font-heading mt-3 text-3xl font-bold leading-tight text-navy sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 text-sm text-[#6B7280]">
          By {post.author_name} · {post.author_role}
        </p>
      </header>

      {/* Hero image */}
      {post.hero_image_url && (
        <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-2xl bg-secondary">
          <Image
            src={post.hero_image_url}
            alt={post.hero_image_alt ?? post.title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="mt-10">
        <BlogContent content={post.content} />
      </div>

      {/* CTA */}
      <BlogCTA post={post} />

      {/* Tags */}
      <div className="mt-8 border-t border-border pt-6">
        <BlogTags tags={post.tags} />
      </div>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <section className="mt-10">
          <h2 className="font-heading mb-4 text-xl font-bold text-navy">
            Featured in this article
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {relatedProducts.map((product) => (
              <ProductCard key={product.sku} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Share */}
      <div className="mt-10 border-t border-border pt-6">
        <BlogShare path={`/blog/${post.slug}`} title={post.title} />
      </div>

      {/* Related posts */}
      <RelatedPosts posts={related} />
    </article>
  );
}
