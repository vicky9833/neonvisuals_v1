"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils/format";
import type { BlogAdminStats, BlogPost } from "@/lib/engines/blog";
import { CATEGORY_LABEL } from "./blog-meta";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-green-50 text-green-700",
  scheduled: "bg-blue-50 text-blue-700",
  archived: "bg-red-50 text-red-700",
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#EDE9E3] bg-white p-4 shadow-sm">
      <p className="font-numbers text-2xl font-bold text-navy">
        {value.toLocaleString("en-IN")}
      </p>
      <p className="mt-0.5 text-xs font-medium text-[#6B7280]">{label}</p>
    </div>
  );
}

export function BlogAdminTable({
  posts,
  stats,
}: {
  posts: BlogPost[];
  stats: BlogAdminStats;
}) {
  const router = useRouter();
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState(false);

  const filtered =
    status === "all" ? posts : posts.filter((p) => p.status === status);

  async function newPost() {
    setBusy(true);
    try {
      const res = await fetch("/api/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled post",
          excerpt: "A new draft.",
          content: "# Untitled post\n\nStart writing…",
          category: "insights",
          status: "draft",
        }),
      });
      const body = await res.json();
      if (res.ok) router.push(`/admin/blog/${body.data.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(post: BlogPost) {
    const next = post.status === "published" ? "draft" : "published";
    await fetch(`/api/blog/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    router.refresh();
  }

  async function archive(post: BlogPost) {
    await fetch(`/api/blog/${post.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total Posts" value={stats.total} />
          <Stat label="Published" value={stats.published} />
          <Stat label="Drafts" value={stats.drafts} />
          <Stat label="Total Views" value={stats.totalViews} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={newPost} disabled={busy}>
          <Plus className="mr-1.5 size-4" /> New Post
        </Button>
      </div>

      <div className="overflow-x-auto rounded-card border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Published</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No posts.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((post) => (
                <TableRow key={post.id}>
                  <TableCell
                    className="cursor-pointer font-medium text-navy"
                    onClick={() => router.push(`/admin/blog/${post.id}`)}
                  >
                    {post.title}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-[#6B7280]">
                    {CATEGORY_LABEL[post.category]}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[post.status]}`}
                    >
                      {post.status}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-[#6B7280]">
                    {post.published_at ? formatDate(post.published_at) : "—"}
                  </TableCell>
                  <TableCell className="font-numbers text-right text-sm">
                    {post.view_count.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/admin/blog/${post.id}`)}
                      >
                        Edit
                      </Button>
                      {post.status !== "archived" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => togglePublish(post)}
                          >
                            {post.status === "published" ? "Unpublish" : "Publish"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => archive(post)}
                          >
                            Archive
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
