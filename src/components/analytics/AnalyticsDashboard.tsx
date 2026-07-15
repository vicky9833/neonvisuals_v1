"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { getAnalytics } from "@/lib/engines/analytics";
import { AnalyticsKPIRow } from "./AnalyticsKPIRow";
import { LineChartCard } from "./LineChartCard";
import { BarChartCard } from "./BarChartCard";
import { PieChartCard } from "./PieChartCard";
import { FunnelChart } from "./FunnelChart";
import { DataTable } from "./DataTable";
import { DateRangeFilter, type DateRange } from "./DateRangeFilter";
import { CHART_COLORS } from "./ChartCard";

type AnalyticsData = Awaited<ReturnType<typeof getAnalytics>>;

function compactRs(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${Math.round(n)}`;
}

function num(n: number): string {
  return n.toLocaleString("en-IN");
}

interface Props {
  initialData: AnalyticsData;
  initialRange: DateRange;
}

export function AnalyticsDashboard({ initialData, initialRange }: Props) {
  const [data, setData] = useState<AnalyticsData>(initialData);
  const [range, setRange] = useState<DateRange>(initialRange);
  const [loading, setLoading] = useState(false);

  async function changeRange(next: DateRange) {
    setRange(next);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/ops/analytics?start=${next.start}&end=${next.end}&section=all`,
      );
      if (res.ok) {
        const body = await res.json();
        setData(body.data as AnalyticsData);
      }
    } finally {
      setLoading(false);
    }
  }

  function exportAll() {
    const rows: Record<string, string | number>[] = [];
    const r = data.revenue;
    const f = data.financial;
    const s = data.sales;
    if (r) {
      rows.push({ metric: "Total Revenue", value: r.totalRevenue });
      rows.push({ metric: "COGS", value: r.totalCost });
      rows.push({ metric: "Gross Profit", value: r.grossProfit });
      rows.push({ metric: "Gross Margin %", value: r.grossMarginPercent });
      rows.push({ metric: "Total Orders", value: r.totalOrders });
    }
    if (s) rows.push({ metric: "Conversion Rate %", value: s.conversionRate });
    if (f) {
      rows.push({ metric: "Collected", value: f.totalCollected });
      rows.push({ metric: "Outstanding", value: f.totalOutstanding });
    }
    const csv = ["metric,value", ...rows.map((x) => `${x.metric},${x.value}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analytics-summary.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const rev = data.revenue;
  const sales = data.sales;
  const clients = data.clients;
  const products = data.products;
  const gifts = data.gifts;
  const fin = data.financial;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangeFilter value={range} onChange={changeRange} />
        <div className="flex items-center gap-3">
          {loading && <span className="text-sm text-[#9CA3AF]">Updating…</span>}
          <button
            type="button"
            onClick={exportAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-navy hover:bg-secondary"
          >
            <Download className="size-4" /> Export All
          </button>
        </div>
      </div>

      <Tabs defaultValue="revenue">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="sales">Sales Funnel</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="gifts">Gift Impact</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        {/* Revenue */}
        <TabsContent value="revenue" className="mt-4 space-y-4">
          {rev && (
            <>
              <AnalyticsKPIRow
                items={[
                  { label: "Revenue", value: compactRs(rev.totalRevenue), accent: "gold" },
                  { label: "COGS", value: compactRs(rev.totalCost) },
                  { label: "Gross Profit", value: compactRs(rev.grossProfit), accent: "green" },
                  { label: "Gross Margin", value: `${rev.grossMarginPercent}%`, accent: "gold" },
                  { label: "Avg Order Value", value: compactRs(rev.avgOrderValue) },
                ]}
              />
              <LineChartCard
                title="Revenue Trend"
                data={rev.revenueByMonth}
                xKey="month"
                currency
                series={[
                  { key: "revenue", name: "Revenue", color: CHART_COLORS.gold },
                  { key: "cost", name: "COGS", color: CHART_COLORS.slate },
                  { key: "profit", name: "Profit", color: CHART_COLORS.green },
                ]}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <BarChartCard
                  title="Revenue by Collection"
                  data={rev.revenueByCollection}
                  labelKey="collectionName"
                  valueKey="revenue"
                  horizontal
                  multicolor
                  currency
                  height={340}
                />
                <BarChartCard
                  title="Top 10 Clients by Revenue"
                  data={rev.revenueByClient}
                  labelKey="companyName"
                  valueKey="revenue"
                  horizontal
                  currency
                  height={340}
                />
              </div>
              <DataTable
                title="Top 10 Products by Revenue"
                columns={[
                  { key: "sku", label: "SKU" },
                  { key: "name", label: "Name" },
                  { key: "unitsSold", label: "Units", numeric: true },
                  { key: "revenue", label: "Revenue", numeric: true, render: (r) => compactRs(Number(r.revenue)) },
                ]}
                rows={rev.topProducts}
              />
            </>
          )}
        </TabsContent>

        {/* Sales funnel */}
        <TabsContent value="sales" className="mt-4 space-y-4">
          {sales && (
            <>
              <AnalyticsKPIRow
                items={[
                  { label: "Total Leads", value: num(sales.leadsCreated) },
                  { label: "Conversion Rate", value: `${sales.conversionRate}%`, accent: "green" },
                  { label: "Avg Days to Close", value: `${sales.avgDaysToClose}d` },
                  { label: "Pipeline Value", value: compactRs(sales.pipelineValue), accent: "gold" },
                ]}
              />
              <FunnelChart data={sales.funnelData} />
              <div className="grid gap-4 lg:grid-cols-2">
                <PieChartCard
                  title="Leads by Source"
                  data={sales.leadsBySource}
                  nameKey="source"
                  valueKey="count"
                />
                <BarChartCard
                  title="Lost Reasons"
                  data={sales.lostReasons}
                  labelKey="reason"
                  valueKey="count"
                  horizontal
                  color={CHART_COLORS.red}
                  height={300}
                />
              </div>
            </>
          )}
        </TabsContent>

        {/* Clients */}
        <TabsContent value="clients" className="mt-4 space-y-4">
          {clients && (
            <>
              <AnalyticsKPIRow
                items={[
                  { label: "Total Clients", value: num(clients.totalClients) },
                  { label: "New This Period", value: num(clients.newClients), accent: "green" },
                  { label: "Retention Rate", value: `${clients.clientRetentionRate}%`, accent: "gold" },
                  { label: "Avg LTV", value: compactRs(clients.avgLifetimeValue) },
                ]}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <PieChartCard
                  title="Clients by Industry"
                  data={clients.clientsByIndustry}
                  nameKey="industry"
                  valueKey="count"
                />
                <BarChartCard
                  title="Clients by Size"
                  data={clients.clientsBySize}
                  labelKey="size"
                  valueKey="count"
                  multicolor
                />
              </div>
              <DataTable
                title="Top Clients"
                columns={[
                  { key: "name", label: "Company" },
                  { key: "revenue", label: "Revenue", numeric: true, render: (r) => compactRs(Number(r.revenue)) },
                  { key: "orders", label: "Orders", numeric: true },
                  { key: "employees", label: "Employees", numeric: true },
                ]}
                rows={clients.topClients}
              />
            </>
          )}
        </TabsContent>

        {/* Products */}
        <TabsContent value="products" className="mt-4 space-y-4">
          {products && (
            <>
              <AnalyticsKPIRow
                items={[
                  { label: "Units Sold", value: num(products.totalProductsSold) },
                  { label: "Unique SKUs", value: num(products.uniqueSkusSold) },
                  { label: "Desk Test Pass", value: `${products.deskTestPassRate}%`, accent: "green" },
                  { label: "Avg WOW Score", value: `${products.avgWowScore}`, accent: "gold" },
                ]}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <BarChartCard
                  title="Top 10 Products"
                  data={products.topSellingProducts}
                  labelKey="name"
                  valueKey="unitsSold"
                  horizontal
                  height={340}
                />
                <PieChartCard
                  title="Packaging Tier Distribution"
                  data={products.packagingTierBreakdown}
                  nameKey="tier"
                  valueKey="count"
                />
              </div>
              <BarChartCard
                title="Sales by Collection"
                data={products.productsByCollection}
                labelKey="name"
                valueKey="unitsSold"
                multicolor
              />
              <DataTable
                title="Bottom Products (no sales this period)"
                columns={[
                  { key: "sku", label: "SKU" },
                  { key: "name", label: "Name" },
                  { key: "unitsSold", label: "Units", numeric: true },
                ]}
                rows={products.bottomProducts}
              />
            </>
          )}
        </TabsContent>

        {/* Gift impact */}
        <TabsContent value="gifts" className="mt-4 space-y-4">
          {gifts && (
            <>
              <AnalyticsKPIRow
                items={[
                  { label: "Gifts Sent", value: num(gifts.totalGiftsSent) },
                  { label: "Desk Test Score", value: `${gifts.overallDeskTestScore}%`, accent: "green" },
                  { label: "Avg Reaction", value: `${gifts.overallReactionScore}/5`, accent: "gold" },
                  { label: "LinkedIn Post Rate", value: `${gifts.linkedinPostRate}%` },
                ]}
              />
              <LineChartCard
                title="Gifts Over Time"
                data={gifts.giftsTimeline}
                xKey="month"
                series={[{ key: "count", name: "Gifts", color: CHART_COLORS.gold }]}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <BarChartCard
                  title="Desk Test Score by Collection"
                  data={gifts.deskTestByCollection}
                  labelKey="collection"
                  valueKey="score"
                  horizontal
                  height={320}
                />
                <PieChartCard
                  title="Reaction Distribution"
                  data={gifts.reactionDistribution}
                  nameKey="reaction"
                  valueKey="count"
                />
              </div>
              <BarChartCard
                title="Gifts by Occasion"
                data={gifts.giftsByOccasion}
                labelKey="occasion"
                valueKey="count"
                horizontal
                multicolor
              />
            </>
          )}
        </TabsContent>

        {/* Financial */}
        <TabsContent value="financial" className="mt-4 space-y-4">
          {fin && (
            <>
              <AnalyticsKPIRow
                items={[
                  { label: "Invoiced", value: compactRs(fin.totalInvoiced), accent: "gold" },
                  { label: "Collected", value: compactRs(fin.totalCollected), accent: "green" },
                  { label: "Collection Rate", value: `${fin.collectionRate}%` },
                  { label: "Avg Pay Days", value: `${fin.avgPaymentDays}d` },
                ]}
              />
              <LineChartCard
                title="Invoiced vs Collected"
                data={fin.invoicesByMonth}
                xKey="month"
                currency
                series={[
                  { key: "invoiced", name: "Invoiced", color: CHART_COLORS.navy },
                  { key: "collected", name: "Collected", color: CHART_COLORS.green },
                ]}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <BarChartCard
                  title="Cash Flow (net by month)"
                  data={fin.cashFlowByMonth}
                  labelKey="month"
                  valueKey="net"
                  currency
                  color={CHART_COLORS.gold}
                />
                <PieChartCard
                  title="Payment Methods"
                  data={fin.paymentMethodBreakdown}
                  nameKey="method"
                  valueKey="amount"
                />
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
