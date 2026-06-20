import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { getPostById } from "@/lib/engines/blog";

export const metadata: Metadata = { title: "Edit Post" };

export const dynamic = "force-dynamic";

export default async function AdminBlogEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/blog"
        className="inline-flex items-center gap-1 text-sm font-medium text-[#6B7280] hover:text-navy"
      >
        <ArrowLeft className="size-4" /> Back to posts
      </Link>
      <BlogEditor post={post} />
    </div>
  );
}
