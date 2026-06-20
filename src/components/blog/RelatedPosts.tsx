import type { BlogPost } from "@/lib/engines/blog";
import { BlogCard } from "./BlogCard";

export function RelatedPosts({ posts }: { posts: BlogPost[] }) {
  if (!posts || posts.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="font-heading mb-6 text-2xl font-bold text-navy">
        Related Articles
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
