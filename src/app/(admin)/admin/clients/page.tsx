import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Clients" };

export default function AdminClientsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Clients" description="Organizations and their accounts." />
      <EmptyState title="No clients yet" />
    </div>
  );
}
