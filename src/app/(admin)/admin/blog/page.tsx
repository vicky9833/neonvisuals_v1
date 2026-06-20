import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { BlogAdminTable } from "@/components/blog/BlogAdminTable";
import { getBlogStats, listAllPosts } from "@/lib/engines/blog";

export const metadata: Metadata = { title: "Blog" };

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const [{ posts }, stats] = await Promise.all([
    listAllPosts(),
    getBlogStats(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Blog Management"
        description="Write, publish, and schedule journal articles."
      />
      <BlogAdminTable posts={posts} stats={stats} />
    </div>
  );
}
