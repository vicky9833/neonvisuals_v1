import type { Metadata } from "next";
import { getProfile } from "@/lib/auth";
import { getAuthContext, authorizeTenant } from "@/lib/authz/context";
import { SetPageTitle } from "@/components/dashboard/DashboardProvider";
import { ClientBillingView } from "@/components/billing/ClientBillingView";
import { UpgradeCard } from "@/components/billing/UpgradeCard";
import { getCompanyPlanContext } from "@/lib/employees/queries";
import { isProPlan } from "@/lib/employees/plan-gate";
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

  // Ruling C (§8b): subscription/billing invoices are billing.manage-gated (owner/admin/finance);
  // order invoices keep their existing company-wide read. Non-billing roles see only order invoices.
  const ctx = await getAuthContext();
  const canSeeBilling =
    !!ctx &&
    (ctx.isPlatformStaff ||
      (!!companyId &&
        authorizeTenant(ctx, companyId, "billing.manage").effect === "allow"));

  const [invoicesResult, stats] = companyId
    ? await Promise.all([
        listInvoices({ companyId, pageSize: 100, includeSubscription: canSeeBilling }),
        getBillingStats(companyId),
      ])
    : [{ invoices: [] }, EMPTY_STATS];

  const clientInvoices = invoicesResult.invoices.map(toClientInvoice);

  // Real plan tier + who may initiate checkout (billing.manage: owner/admin/finance).
  const isPro = companyId ? isProPlan(await getCompanyPlanContext(companyId)) : false;
  const canUpgrade = canSeeBilling;

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
      <UpgradeCard isPro={isPro} canUpgrade={canUpgrade} />
      <ClientBillingView initialInvoices={clientInvoices} initialStats={stats} />
    </div>
  );
}
