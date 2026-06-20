import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { BillingStats } from "@/components/billing/BillingStats";
import { InvoiceList } from "@/components/billing/InvoiceList";
import { PaymentHistory } from "@/components/billing/PaymentHistory";
import { getBillingStats, listInvoices } from "@/lib/engines/billing";
import { isRazorpayConfigured } from "@/lib/services/razorpay";

export const metadata: Metadata = { title: "Billing" };

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const [{ invoices }, stats] = await Promise.all([
    listInvoices({ pageSize: 100 }),
    getBillingStats(),
  ]);
  const razorpayConfigured = isRazorpayConfigured();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing & Invoicing"
        description="Generate tax invoices, collect payments, and track outstanding amounts."
      />
      <BillingStats stats={stats} />
      <InvoiceList
        initialInvoices={invoices}
        razorpayConfigured={razorpayConfigured}
      />
      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Recent Payments
        </h2>
        <PaymentHistory payments={stats.recentPayments} />
      </section>
    </div>
  );
}
