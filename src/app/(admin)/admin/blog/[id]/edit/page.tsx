import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Edit post" };

type Params = { params: Promise<{ id: string }> };

export default async function AdminBlogEditPage({ params }: Params) {
  const { id } = await params;
  return (
    <div className="space-y-8">
      <PageHeader title="Edit post" description={`Editing post ${id}.`} />
    </div>
  );
}
