"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/utils/format";
import type { BlogPost } from "@/lib/engines/blog";
import { PlaceholderImage } from "@/components/products/placeholder-image";
import { CATEGORY_LABEL } from "./blog-meta";
import { blogFallbackImage } from "./blog-fallback-images";

interface BlogCardProps {
  post: Pick<
    BlogPost,
    | "slug"
    | "title"
    | "excerpt"
    | "category"
    | "hero_image_url"
    | "hero_image_alt"
    | "read_time_minutes"
    | "published_at"
    | "created_at"
  >;
  /** Card position, used to vary the product-image fallback per card. */
  index?: number;
}

export function BlogCard({ post, index = 0 }: BlogCardProps) {
  const date = post.published_at ?? post.created_at;
  // Priority: use the DB hero_image_url when it's a valid non-empty string;
  // only if it's null/empty OR fails to load do we fall back to a real premium
  // product photo (varied per card via index). The gift-icon placeholder is a
  // last resort shown only if that product image ALSO fails.
  const [heroFailed, setHeroFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const hasHero = Boolean(post.hero_image_url?.trim());
  const showHero = hasHero && !heroFailed;
  // Use the card's list position so each card in a view cycles through the
  // fallback array one-for-one (0,1,2,... all distinct) with no repeats until
  // the list is longer than the array.
  const fallbackSrc = blogFallbackImage(index);

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="flex h-full flex-col overflow-hidden rounded-xl border border-[#EDE9E3] bg-white shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-t-xl bg-[#FAFAF8]">
          {showHero ? (
            <Image
              src={post.hero_image_url as string}
              alt={post.hero_image_alt ?? post.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              onError={() => setHeroFailed(true)}
            />
          ) : !fallbackFailed ? (
            <Image
              src={fallbackSrc}
              alt={post.hero_image_alt ?? post.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              onError={() => setFallbackFailed(true)}
            />
          ) : (
            <PlaceholderImage name={post.title} />
          )}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gold">
            {CATEGORY_LABEL[post.category]} · {post.read_time_minutes} min read
          </p>
          <h3 className="font-heading mt-2 line-clamp-2 text-lg font-semibold text-navy">
            {post.title}
          </h3>
          <p className="mt-2 line-clamp-3 flex-1 text-sm text-[#6B7280]">
            {post.excerpt}
          </p>
          {date && (
            <p className="mt-4 text-xs text-[#9CA3AF]">{formatDate(date)}</p>
          )}
        </div>
      </article>
    </Link>
  );
}
