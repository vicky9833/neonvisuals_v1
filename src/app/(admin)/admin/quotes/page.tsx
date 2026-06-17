import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { QuotesAdmin } from "@/components/admin/quotes-admin";

export const metadata: Metadata = { title: "Quotes" };

// TODO: Protect with admin auth (Prompt 08). Temporary quote-flow test page.
export default function AdminQuotesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Quotes"
        description="Create, price, and generate branded quote PDFs. Internal use only."
      />
      <QuotesAdmin />
    </div>
  );
}
