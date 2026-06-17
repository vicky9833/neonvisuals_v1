import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Leads" };

export default function AdminLeadsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Leads" description="Inbound enquiries and quote requests." />
      <EmptyState title="No leads yet" description="New enquiries will appear here." />
    </div>
  );
}
