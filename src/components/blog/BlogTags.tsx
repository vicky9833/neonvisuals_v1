import Link from "next/link";

export function BlogTags({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Link
          key={tag}
          href={`/blog?tag=${encodeURIComponent(tag)}`}
          className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-navy transition-colors hover:bg-gold/20"
        >
          #{tag}
        </Link>
      ))}
    </div>
  );
}
