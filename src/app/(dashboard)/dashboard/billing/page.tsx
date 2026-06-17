import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Billing" };

export default function BillingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing"
        description="GST invoices, purchase orders, and credit terms (Net-15/30/60)."
      />
    </div>
  );
}
