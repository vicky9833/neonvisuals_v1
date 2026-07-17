import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/authz/context";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/shared/page-header";
import { PendingApprovalsList, type PendingApprovalRow } from "@/components/dashboard/PendingApprovalsList";
import {
  computeQuoteAmount,
  isOverBudget,
  occasionTypeKeyFromOccasionKey,
} from "@/lib/engines/approval-workflow";

export const metadata: Metadata = {
  title: "Approvals",
  description: "Quotes awaiting approval in your organisation.",
  robots: { index: false, follow: false },
};

function formatAmount(amount: number | null): string {
  if (amount == null) return "—";
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export default async function ApprovalsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login?redirect=%2Fdashboard%2Fquotes%2Fapprovals");
  const companyId = ctx.activeCompanyId;
  if (!companyId) redirect("/onboarding");

  // Pending-approval quotes, RLS-scoped to the caller's own company, oldest first.
  const supabase = await createClient();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, quote_number, occasion, occasion_key, final_total, total_amount, approval_routed_to, budget_hint, created_at")
    .eq("approval_status", "pending")
    .order("created_at", { ascending: true })
    .limit(100);

  // Resolve occasion TYPE default budgets (durable reference data) for the over-budget signal.
  const typeKeys = Array.from(
    new Set(
      (quotes ?? [])
        .map((q) => occasionTypeKeyFromOccasionKey(q.occasion_key as string | null))
        .filter((k): k is string => Boolean(k)),
    ),
  );
  const budgetByType = new Map<string, number | null>();
  if (typeKeys.length > 0) {
    const admin = createAdminClient();
    const { data: types } = await admin
      .from("occasion_types")
      .select("key, default_budget")
      .in("key", typeKeys);
    for (const t of types ?? []) budgetByType.set(t.key as string, (t.default_budget as number | null) ?? null);
  }

  const rows: PendingApprovalRow[] = (quotes ?? []).map((q) => {
    const amount = computeQuoteAmount({
      final_total: q.final_total as number | null,
      total_amount: q.total_amount as number | null,
    });
    const typeKey = occasionTypeKeyFromOccasionKey(q.occasion_key as string | null);
    // Budget = occasion type default; the requester's budget_hint is a fallback when no type default.
    const typeBudget = typeKey ? budgetByType.get(typeKey) ?? null : null;
    const budget = typeBudget ?? (q.budget_hint as number | null) ?? null;
    return {
      id: q.id as string,
      quoteRef: (q.quote_number as string | null) ?? (q.id as string),
      occasionLabel: (q.occasion as string | null) ?? null,
      amountLabel: formatAmount(amount),
      routedTo: (q.approval_routed_to as string | null) ?? null,
      overBudget: isOverBudget(amount, budget),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Quotes routed to you for approval. Over-budget quotes are flagged for your awareness."
      />
      <PendingApprovalsList rows={rows} />
    </div>
  );
}
