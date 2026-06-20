import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBillingStats } from "@/lib/engines/billing";
import { getOrderStats } from "@/lib/engines/order";
import { getLeadStats, PIPELINE_STAGES } from "@/lib/engines/lead";
import { PRODUCTS } from "@/lib/catalog";

export interface AdminActivityItem {
  id: string;
  icon: "quote" | "order" | "lead" | "invoice" | "blog";
  description: string;
  timestamp: string;
  href: string;
}

export interface AdminOverviewData {
  revenue: {
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
    grossMarginPercent: number;
  };
  ops: {
    totalOrders: number;
    activeOrders: number;
    totalClients: number;
    totalProducts: number;
  };
  pipeline: {
    totalLeads: number;
    pipelineValue: number;
    byStatus: Record<string, number>;
    conversionRate: number;
    overdueFollowUps: number;
  };
  recentActivity: AdminActivityItem[];
}

const ACTIVE_ORDER_STATUSES = [
  "confirmed",
  "in_production",
  "quality_check",
  "packed",
  "shipped",
];

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

async function countCompanies(): Promise<number> {
  const supa = createAdminClient();
  const { count } = await supa
    .from("companies")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

async function avgMargin(): Promise<number> {
  const supa = createAdminClient();
  const { data } = await supa.from("products").select("margin_percent");
  const rows = (data ?? []).filter((r) => r.margin_percent != null);
  if (rows.length === 0) return 0;
  const sum = rows.reduce((s, r) => s + Number(r.margin_percent), 0);
  return Math.round(sum / rows.length);
}

async function recentActivity(): Promise<AdminActivityItem[]> {
  const supa = createAdminClient();
  const items: AdminActivityItem[] = [];

  const [quotes, orders, leads, invoices, blog] = await Promise.all([
    safe(
      async () =>
        (
          await supa
            .from("quotes")
            .select("id, quote_number, status, created_at")
            .order("created_at", { ascending: false })
            .limit(5)
        ).data ?? [],
      [] as Record<string, unknown>[],
    ),
    safe(
      async () =>
        (
          await supa
            .from("orders")
            .select("id, order_number, status, created_at")
            .order("created_at", { ascending: false })
            .limit(5)
        ).data ?? [],
      [] as Record<string, unknown>[],
    ),
    safe(
      async () =>
        (
          await supa
            .from("leads")
            .select("id, company_name, source, created_at")
            .order("created_at", { ascending: false })
            .limit(5)
        ).data ?? [],
      [] as Record<string, unknown>[],
    ),
    safe(
      async () =>
        (
          await supa
            .from("invoices")
            .select("id, invoice_number, status, amount_paid, created_at")
            .order("created_at", { ascending: false })
            .limit(5)
        ).data ?? [],
      [] as Record<string, unknown>[],
    ),
    safe(
      async () =>
        (
          await supa
            .from("blog_posts")
            .select("id, title, slug, status, published_at, created_at")
            .order("created_at", { ascending: false })
            .limit(5)
        ).data ?? [],
      [] as Record<string, unknown>[],
    ),
  ]);

  for (const q of quotes) {
    items.push({
      id: `quote-${q.id}`,
      icon: "quote",
      description: `Quote ${q.quote_number ?? ""} ${q.status === "accepted" ? "accepted" : "created"}`.trim(),
      timestamp: q.created_at as string,
      href: "/admin/quotes",
    });
  }
  for (const o of orders) {
    items.push({
      id: `order-${o.id}`,
      icon: "order",
      description: `Order ${o.order_number ?? ""} · ${(o.status as string)?.replace("_", " ")}`.trim(),
      timestamp: o.created_at as string,
      href: `/admin/orders/${o.id}`,
    });
  }
  for (const l of leads) {
    items.push({
      id: `lead-${l.id}`,
      icon: "lead",
      description: `New lead: ${l.company_name} (${l.source})`,
      timestamp: l.created_at as string,
      href: "/admin/leads",
    });
  }
  for (const inv of invoices) {
    items.push({
      id: `invoice-${inv.id}`,
      icon: "invoice",
      description: `Invoice ${inv.invoice_number ?? ""} · ${inv.status}`.trim(),
      timestamp: inv.created_at as string,
      href: "/admin/billing",
    });
  }
  for (const b of blog) {
    items.push({
      id: `blog-${b.id}`,
      icon: "blog",
      description: `Blog "${b.title}" ${b.status === "published" ? "published" : "saved"}`,
      timestamp: (b.published_at as string) ?? (b.created_at as string),
      href: "/admin/blog",
    });
  }

  return items
    .filter((i) => i.timestamp)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 10);
}

export async function getAdminOverview(): Promise<AdminOverviewData> {
  const [billing, orders, leads, clients, margin, activity] = await Promise.all([
    safe(getBillingStats, {
      totalInvoiced: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      overdueAmount: 0,
      overdueCount: 0,
      invoicesByStatus: {},
      collectionRate: 0,
      recentPayments: [],
    }),
    safe(() => getOrderStats(), {
      total: 0,
      byStatus: {},
      totalRevenue: 0,
      avgOrderValue: 0,
      thisMonth: 0,
      lastMonth: 0,
    }),
    safe(getLeadStats, {
      total: 0,
      byStatus: {},
      bySource: {},
      byPriority: {},
      pipelineValue: 0,
      conversionRate: 0,
      avgDaysToConvert: 0,
      overdueFollowUps: 0,
      thisWeekFollowUps: 0,
    }),
    safe(countCompanies, 0),
    safe(avgMargin, 0),
    safe(recentActivity, [] as AdminActivityItem[]),
  ]);

  const activeOrders = ACTIVE_ORDER_STATUSES.reduce(
    (sum, s) => sum + (orders.byStatus[s] ?? 0),
    0,
  );

  return {
    revenue: {
      totalInvoiced: billing.totalInvoiced,
      totalCollected: billing.totalCollected,
      totalOutstanding: billing.totalOutstanding,
      grossMarginPercent: margin,
    },
    ops: {
      totalOrders: orders.total,
      activeOrders,
      totalClients: clients,
      totalProducts: PRODUCTS.length,
    },
    pipeline: {
      totalLeads: leads.total,
      pipelineValue: leads.pipelineValue,
      byStatus: leads.byStatus,
      conversionRate: leads.conversionRate,
      overdueFollowUps: leads.overdueFollowUps,
    },
    recentActivity: activity,
  };
}

export { PIPELINE_STAGES };
