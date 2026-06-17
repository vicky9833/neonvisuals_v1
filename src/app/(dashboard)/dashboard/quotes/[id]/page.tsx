import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Quote" };

type Params = { params: Promise<{ id: string }> };

export default async function QuoteDetailPage({ params }: Params) {
  const { id } = await params;
  return (
    <div className="space-y-8">
      <PageHeader title="Quote" description={`Details for quote ${id}.`} />
    </div>
  );
}
