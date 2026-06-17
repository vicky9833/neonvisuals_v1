import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Orders" };

export default function AdminOrdersPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Orders" description="All orders across clients." />
      <EmptyState title="No orders yet" />
    </div>
  );
}
