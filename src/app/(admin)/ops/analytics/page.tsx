import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { getAnalytics } from "@/lib/engines/analytics";

export const metadata: Metadata = { title: "Analytics" };

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const now = new Date();
  const range = {
    start: `${now.getFullYear()}-01-01`,
    end: now.toISOString().slice(0, 10),
  };
  const data = await getAnalytics(range, "all");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Revenue, sales, clients, products, gift impact, and financials at a glance."
      />
      <AnalyticsDashboard initialData={data} initialRange={range} />
    </div>
  );
}
