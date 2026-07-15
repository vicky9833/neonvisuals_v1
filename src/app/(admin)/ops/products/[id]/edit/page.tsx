import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Edit product" };

type Params = { params: Promise<{ id: string }> };

export default async function AdminProductEditPage({ params }: Params) {
  const { id } = await params;
  return (
    <div className="space-y-8">
      <PageHeader title="Edit product" description={`Editing product ${id}.`} />
    </div>
  );
}
