import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Blog" };

export default function AdminBlogPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Blog" description="Author and manage journal posts." />
      <EmptyState title="No posts yet" />
    </div>
  );
}
