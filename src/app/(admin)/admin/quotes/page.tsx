import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { QuotesAdmin } from "@/components/admin/quotes-admin";

export const metadata: Metadata = { title: "Quotes" };

// Access is enforced by proxy.ts: /admin/* requires an authenticated
// super_admin (non-admins are redirected to /dashboard or /login).
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
