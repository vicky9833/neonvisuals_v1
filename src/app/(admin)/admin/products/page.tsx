import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Products" };

export default function AdminProductsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Products" description="Manage the SKU catalogue." />
      <EmptyState title="No products yet" description="Seed the catalogue to begin." />
    </div>
  );
}
