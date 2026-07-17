import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { OpsConciergeInbox } from "@/components/concierge/OpsConciergeInbox";

export const metadata: Metadata = { title: "Concierge" };

// Access enforced by proxy.ts (/ops/* = platform staff) + the API route gates on the
// `platform.concierge.inbox` capability (owner/admin/ops/support; finance denied).
export default function OpsConciergePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Concierge inbox"
        description="Every client's gifting concierge requests, across all organisations, in one queue."
      />
      <OpsConciergeInbox />
    </div>
  );
}
