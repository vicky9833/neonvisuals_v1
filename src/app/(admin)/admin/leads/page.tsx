import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { LeadsWorkspace } from "@/components/leads/LeadsWorkspace";

export const metadata: Metadata = { title: "Sales Pipeline" };

export const dynamic = "force-dynamic";

export default function AdminLeadsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Sales Pipeline"
        description="Every enquiry, from first message to closed deal. Internal use only."
      />
      <LeadsWorkspace />
    </div>
  );
}
