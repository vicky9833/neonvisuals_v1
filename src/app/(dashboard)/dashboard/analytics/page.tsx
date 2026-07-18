import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext, authorizeTenant } from "@/lib/authz/context";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCompanySpendSummary } from "@/lib/engines/spend";
import { formatCurrency } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Recognition coverage, spend, and engagement trends.",
  robots: { index: false, follow: false },
};

/**
 * P9b §R5 — Aggregate spend dashboard (tenant-scoped, `dashboards.view`-gated; finance included).
 * Shows totals + per-department + per-occasion rollups from THIS company's orders/gift records.
 * NEVER renders named-per-employee gift history — that stays `employees.view_pii`-gated (7c). The
 * spend engine returns only aggregates (no employee names), so this surface cannot leak identity.
 */
export default async function AnalyticsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login?redirect=%2Fdashboard%2Fanalytics");
  const companyId = ctx.activeCompanyId;
  if (!companyId) redirect("/onboarding");

  const canView = authorizeTenant(ctx, companyId, "dashboards.view").effect === "allow";
  if (!canView) {
    return (
      <div className="space-y-8">
        <PageHeader title="Analytics" description="Recognition coverage, spend, and engagement trends." />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            You don&apos;t have access to spend analytics. Ask an owner or admin for access.
          </CardContent>
        </Card>
      </div>
    );
  }

  const spend = await getCompanySpendSummary(companyId);
  const hasSpend = spend.totalOrders > 0 || spend.totalGifts > 0;

  const summaryCards = [
    { label: "Total order value", value: formatCurrency(spend.totalOrderValue) },
    { label: "Gift spend", value: formatCurrency(spend.totalGiftSpend) },
    { label: "Gifts recorded", value: spend.totalGifts.toLocaleString("en-IN") },
    { label: "Orders", value: spend.totalOrders.toLocaleString("en-IN") },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Aggregate recognition spend across your team. Named gift history stays private."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-serif text-2xl">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {!hasSpend ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No spend recorded yet. Once orders and gifts are logged, your rollups appear here.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Spend by department</CardTitle>
            </CardHeader>
            <CardContent>
              {spend.byDepartment.length === 0 ? (
                <p className="text-sm text-muted-foreground">No gift spend to attribute yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Department</th>
                      <th className="pb-2 text-right font-medium">Gifts</th>
                      <th className="pb-2 text-right font-medium">Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spend.byDepartment.map((d) => (
                      <tr key={d.department} className="border-b border-border/50 last:border-0">
                        <td className="py-2">{d.department}</td>
                        <td className="py-2 text-right tabular-nums">{d.giftCount}</td>
                        <td className="py-2 text-right tabular-nums">{formatCurrency(d.spend)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Spend by occasion</CardTitle>
            </CardHeader>
            <CardContent>
              {spend.byOccasion.length === 0 ? (
                <p className="text-sm text-muted-foreground">No gift spend to attribute yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Occasion</th>
                      <th className="pb-2 text-right font-medium">Gifts</th>
                      <th className="pb-2 text-right font-medium">Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spend.byOccasion.map((o) => (
                      <tr key={o.occasion} className="border-b border-border/50 last:border-0">
                        <td className="py-2 capitalize">{o.occasion.replace(/_/g, " ")}</td>
                        <td className="py-2 text-right tabular-nums">{o.giftCount}</td>
                        <td className="py-2 text-right tabular-nums">{formatCurrency(o.spend)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
