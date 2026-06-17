import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Lead" };

type Params = { params: Promise<{ id: string }> };

export default async function AdminLeadDetailPage({ params }: Params) {
  const { id } = await params;
  return (
    <div className="space-y-8">
      <PageHeader title="Lead" description={`Lead detail and follow-up for ${id}.`} />
    </div>
  );
}
