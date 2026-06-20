import type { Metadata } from "next";
import { getProfile } from "@/lib/auth";
import { SetPageTitle } from "@/components/dashboard/DashboardProvider";
import { ClientBillingView } from "@/components/billing/ClientBillingView";
import {
  getBillingStats,
  listInvoices,
  toClientInvoice,
  type BillingStats,
} from "@/lib/engines/billing";

export const metadata: Metadata = { title: "Billing" };

export const dynamic = "force-dynamic";

const EMPTY_STATS: BillingStats = {
  totalInvoiced: 0,
  totalCollected: 0,
  totalOutstanding: 0,
  overdueAmount: 0,
  overdueCount: 0,
  invoicesByStatus: {},
  collectionRate: 0,
  recentPayments: [],
};

export default async function BillingPage() {
  const profile = await getProfile();
  const companyId = profile?.company_id ?? "";

  const [invoicesResult, stats] = companyId
    ? await Promise.all([
        listInvoices({ companyId, pageSize: 100 }),
        getBillingStats(companyId),
      ])
    : [{ invoices: [] }, EMPTY_STATS];

  const clientInvoices = invoicesResult.invoices.map(toClientInvoice);

  return (
    <div className="space-y-6">
      <SetPageTitle title="Billing" />
      <header>
        <h1 className="font-heading text-2xl font-bold text-navy">
          Billing &amp; Payments
        </h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          View your invoices, download PDFs, and pay securely online.
        </p>
      </header>
      <ClientBillingView initialInvoices={clientInvoices} initialStats={stats} />
    </div>
  );
}
