import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/utils/format";
import type { BlogPost } from "@/lib/engines/blog";
import { CATEGORY_LABEL } from "./blog-meta";

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
}

export function BlogCard({ post }: BlogCardProps) {
  const date = post.published_at ?? post.created_at;
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="flex h-full flex-col overflow-hidden rounded-xl border border-[#EDE9E3] bg-white shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md">
        <div className="relative aspect-video w-full overflow-hidden bg-secondary">
          {post.hero_image_url ? (
            <Image
              src={post.hero_image_url}
              alt={post.hero_image_alt ?? post.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : null}
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
