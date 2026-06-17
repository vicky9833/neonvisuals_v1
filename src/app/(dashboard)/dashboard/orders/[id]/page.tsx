import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Order" };

type Params = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Params) {
  const { id } = await params;
  return (
    <div className="space-y-8">
      <PageHeader title="Order" description={`Status and timeline for order ${id}.`} />
    </div>
  );
}
