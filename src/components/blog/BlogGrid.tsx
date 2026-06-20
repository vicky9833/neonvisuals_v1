"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { BlogPost } from "@/lib/engines/blog";
import { BlogCard } from "./BlogCard";
import { CategoryFilter } from "./CategoryFilter";
import { BlogSearch } from "./BlogSearch";

interface BlogGridProps {
  initialPosts: BlogPost[];
  initialTotal: number;
  pageSize?: number;
}

export function BlogGrid({
  initialPosts,
  initialTotal,
  pageSize = 12,
}: BlogGridProps) {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const first = useRef(true);

  const fetchPage = useCallback(
    async (nextPage: number, append: boolean) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category !== "all") params.set("category", category);
        if (search.trim()) params.set("search", search.trim());
        params.set("page", String(nextPage));
        params.set("pageSize", String(pageSize));
        const res = await fetch(`/api/blog?${params.toString()}`);
        if (res.ok) {
          const body = await res.json();
          const newPosts = body.data.posts as BlogPost[];
          setTotal(body.data.total as number);
          setPosts((prev) => (append ? [...prev, ...newPosts] : newPosts));
        }
      } finally {
        setLoading(false);
      }
    },
    [category, search, pageSize],
  );

  // Refetch from page 1 when filters change (skip the very first render).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      setPage(1);
      fetchPage(1, false);
    }, 250);
    return () => clearTimeout(t);
  }, [fetchPage]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  }

  const hasMore = posts.length < total;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <CategoryFilter active={category} onChange={setCategory} />
        <BlogSearch value={search} onChange={setSearch} />
      </div>

      {posts.length === 0 ? (
        <p className="py-16 text-center text-[#9CA3AF]">
          {loading ? "Loading…" : "No articles found. Try a different search."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
