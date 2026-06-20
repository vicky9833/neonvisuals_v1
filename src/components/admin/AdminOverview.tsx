import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import type { AdminOverviewData } from "@/lib/admin/overview";
import { PIPELINE_STAGES } from "@/lib/engines/lead";
import { AdminMetricCard } from "./AdminMetricCard";
import { RecentActivityFeed } from "./RecentActivityFeed";

function compactRs(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${Math.round(n)}`;
}

const QUICK_ACTIONS = [
  { label: "New Lead", href: "/admin/leads" },
  { label: "New Quote", href: "/admin/quotes" },
  { label: "New Order", href: "/admin/orders" },
  { label: "Write Blog Post", href: "/admin/blog" },
];

export function AdminOverview({ data }: { data: AdminOverviewData }) {
  const { revenue, ops, pipeline, recentActivity } = data;
  return (
    <div className="space-y-8">
      {/* Revenue */}
      <section>
        <h2 className="font-heading mb-3 text-sm font-semibold uppercase tracking-wider text-[#9CA3AF]">
          Revenue
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard label="Total Revenue" value={compactRs(revenue.totalInvoiced)} accent="gold" />
          <AdminMetricCard label="Collected" value={compactRs(revenue.totalCollected)} accent="gold" />
          <AdminMetricCard label="Outstanding" value={compactRs(revenue.totalOutstanding)} accent="gold" />
          <AdminMetricCard label="Gross Margin" value={`${revenue.grossMarginPercent}%`} accent="gold" />
        </div>
      </section>

      {/* Operations */}
      <section>
        <h2 className="font-heading mb-3 text-sm font-semibold uppercase tracking-wider text-[#9CA3AF]">
          Operations
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard label="Total Orders" value={ops.totalOrders.toLocaleString("en-IN")} />
          <AdminMetricCard label="Active Orders" value={ops.activeOrders.toLocaleString("en-IN")} />
          <AdminMetricCard label="Total Clients" value={ops.totalClients.toLocaleString("en-IN")} />
          <AdminMetricCard label="Products in Catalog" value={ops.totalProducts.toLocaleString("en-IN")} />
        </div>
      </section>

      {/* Pipeline */}
      <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-base font-semibold text-navy">
            Sales Pipeline
          </h2>
          <Link
            href="/admin/leads"
            className="inline-flex items-center gap-1 text-sm font-medium text-gold hover:underline"
          >
            View Pipeline <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <p className="mt-1 text-sm text-[#6B7280]">
          {pipeline.totalLeads} leads · {compactRs(pipeline.pipelineValue)} value ·
          Conversion {pipeline.conversionRate}% · {pipeline.overdueFollowUps} overdue
          follow-ups
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PIPELINE_STAGES.map((stage) => (
            <span
              key={stage.status}
              className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-navy"
            >
              {stage.label}: {pipeline.byStatus[stage.status] ?? 0}
            </span>
          ))}
        </div>
      </section>

      {/* Activity + quick actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="font-heading mb-3 text-base font-semibold text-navy">
            Recent Activity
          </h2>
          <RecentActivityFeed items={recentActivity} />
        </section>

        <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
          <h2 className="font-heading mb-3 text-base font-semibold text-navy">
            Quick Actions
          </h2>
          <div className="space-y-2">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-navy transition-colors hover:border-navy hover:bg-secondary"
              >
                <Plus className="size-4 text-gold" /> {a.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
