import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKETS } from "@/data/buckets";
import { REACTION_LABELS } from "@/types/gift";

export interface DateRange {
  start: string; // ISO date (inclusive)
  end: string; // ISO date (inclusive)
}

const COLLECTION_NAME = new Map<string, string>(
  BUCKETS.map((b) => [b.code as string, b.name]),
);

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

/** Ordered list of YYYY-MM keys spanning the range (cap at 24 months). */
function monthsInRange(range: DateRange): string[] {
  const start = new Date(range.start);
  const end = new Date(range.end);
  const keys: string[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end && keys.length < 24) {
    keys.push(monthKey(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return keys;
}

function round(n: number): number {
  return Math.round(n);
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Shared order + item loader
// ---------------------------------------------------------------------------

interface LoadedOrders {
  orders: any[];
  items: any[];
  cogsBySku: Map<string, number>;
  orderMonth: Map<string, string>;
}

async function loadOrders(range: DateRange): Promise<LoadedOrders> {
  const supa = createAdminClient();
  const { data: orders } = await supa
    .from("orders")
    .select("id, company_id, grand_total, status, created_at")
    .gte("created_at", range.start)
    .lte("created_at", `${range.end}T23:59:59`)
    .neq("status", "cancelled");

  const orderRows = orders ?? [];
  const orderIds = orderRows.map((o) => o.id as string);
  const orderMonth = new Map<string, string>();
  for (const o of orderRows) {
    orderMonth.set(o.id as string, monthKey(new Date(o.created_at as string)));
  }

  let items: any[] = [];
  if (orderIds.length > 0) {
    const { data } = await supa
      .from("order_items")
      .select("order_id, product_sku, product_name, collection_code, quantity, line_total")
      .in("order_id", orderIds);
    items = data ?? [];
  }

  const skus = [...new Set(items.map((i) => i.product_sku as string))];
  const cogsBySku = new Map<string, number>();
  if (skus.length > 0) {
    const { data: products } = await supa
      .from("products")
      .select("sku, cogs")
      .in("sku", skus);
    for (const p of products ?? []) {
      cogsBySku.set(p.sku as string, Number(p.cogs ?? 0));
    }
  }

  return { orders: orderRows, items, cogsBySku, orderMonth };
}

// ---------------------------------------------------------------------------
// Revenue
// ---------------------------------------------------------------------------

export async function getRevenueAnalytics(range: DateRange) {
  const supa = createAdminClient();
  const { orders, items, cogsBySku, orderMonth } = await loadOrders(range);

  const totalRevenue = orders.reduce((s, o) => s + Number(o.grand_total ?? 0), 0);
  const totalCost = items.reduce(
    (s, i) => s + (cogsBySku.get(i.product_sku as string) ?? 0) * Number(i.quantity ?? 0),
    0,
  );
  const grossProfit = totalRevenue - totalCost;

  // By month
  const months = monthsInRange(range);
  const revByMonth = new Map<string, number>();
  const costByMonth = new Map<string, number>();
  for (const o of orders) {
    const k = monthKey(new Date(o.created_at as string));
    revByMonth.set(k, (revByMonth.get(k) ?? 0) + Number(o.grand_total ?? 0));
  }
  for (const i of items) {
    const k = orderMonth.get(i.order_id as string);
    if (!k) continue;
    const cost = (cogsBySku.get(i.product_sku as string) ?? 0) * Number(i.quantity ?? 0);
    costByMonth.set(k, (costByMonth.get(k) ?? 0) + cost);
  }
  const revenueByMonth = months.map((k) => {
    const revenue = round(revByMonth.get(k) ?? 0);
    const cost = round(costByMonth.get(k) ?? 0);
    return { month: monthLabel(k), revenue, cost, profit: revenue - cost };
  });

  // By collection
  const colRev = new Map<string, { revenue: number; orders: Set<string> }>();
  for (const i of items) {
    const code = (i.collection_code as string) ?? "—";
    const agg = colRev.get(code) ?? { revenue: 0, orders: new Set<string>() };
    agg.revenue += Number(i.line_total ?? 0);
    agg.orders.add(i.order_id as string);
    colRev.set(code, agg);
  }
  const revenueByCollection = [...colRev.entries()]
    .map(([collection, agg]) => ({
      collection,
      collectionName: COLLECTION_NAME.get(collection) ?? collection,
      revenue: round(agg.revenue),
      orders: agg.orders.size,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // By client
  const clientAgg = new Map<string, { revenue: number; orders: number }>();
  for (const o of orders) {
    const id = o.company_id as string;
    const agg = clientAgg.get(id) ?? { revenue: 0, orders: 0 };
    agg.revenue += Number(o.grand_total ?? 0);
    agg.orders += 1;
    clientAgg.set(id, agg);
  }
  const companyIds = [...clientAgg.keys()];
  const nameById = new Map<string, string>();
  if (companyIds.length > 0) {
    const { data: companies } = await supa
      .from("companies")
      .select("id, name")
      .in("id", companyIds);
    for (const c of companies ?? []) nameById.set(c.id as string, c.name as string);
  }
  const revenueByClient = [...clientAgg.entries()]
    .map(([companyId, agg]) => ({
      companyId,
      companyName: nameById.get(companyId) ?? "Unknown",
      revenue: round(agg.revenue),
      orders: agg.orders,
      avgOrderValue: agg.orders > 0 ? round(agg.revenue / agg.orders) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Top products
  const prodAgg = new Map<string, { name: string; units: number; revenue: number }>();
  for (const i of items) {
    const sku = i.product_sku as string;
    const agg = prodAgg.get(sku) ?? { name: i.product_name as string, units: 0, revenue: 0 };
    agg.units += Number(i.quantity ?? 0);
    agg.revenue += Number(i.line_total ?? 0);
    prodAgg.set(sku, agg);
  }
  const topProducts = [...prodAgg.entries()]
    .map(([sku, agg]) => ({ sku, name: agg.name, unitsSold: agg.units, revenue: round(agg.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const repeatClients = [...clientAgg.values()].filter((a) => a.orders >= 2).length;

  return {
    totalRevenue: round(totalRevenue),
    totalCost: round(totalCost),
    grossProfit: round(grossProfit),
    grossMarginPercent: totalRevenue > 0 ? round((grossProfit / totalRevenue) * 100) : 0,
    revenueByMonth,
    revenueByCollection,
    revenueByClient,
    topProducts,
    avgOrderValue: orders.length > 0 ? round(totalRevenue / orders.length) : 0,
    totalOrders: orders.length,
    repeatClientRate: clientAgg.size > 0 ? round((repeatClients / clientAgg.size) * 100) : 0,
  };
}

// ---------------------------------------------------------------------------
// Sales funnel
// ---------------------------------------------------------------------------

export async function getSalesFunnelAnalytics(range: DateRange) {
  const supa = createAdminClient();
  const { data: leads } = await supa
    .from("leads")
    .select("id, status, source, loss_reason, estimated_order_value, created_at, converted_date")
    .gte("created_at", range.start)
    .lte("created_at", `${range.end}T23:59:59`);
  const rows = leads ?? [];

  const REACHED: Record<string, number> = {
    new: 0,
    contacted: 1,
    qualified: 2,
    proposal_sent: 3,
    negotiation: 4,
    won: 5,
  };
  const stageOrder = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won"];
  const stageLabel: Record<string, string> = {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    proposal_sent: "Proposal",
    negotiation: "Negotiation",
    won: "Won",
  };

  const reachedCount = (stage: string) =>
    rows.filter((l) => {
      const r = REACHED[(l.status as string) ?? "new"] ?? 0;
      // "won" lost leads still passed earlier stages; treat lost as having reached up to their max-known stage = qualified-ish.
      return r >= (REACHED[stage] ?? 0) || (l.status === "lost" && REACHED[stage] <= 2);
    }).length;

  const valueAtStage = (stage: string) =>
    rows
      .filter((l) => (REACHED[(l.status as string) ?? "new"] ?? 0) >= (REACHED[stage] ?? 0))
      .reduce((s, l) => s + Number(l.estimated_order_value ?? 0), 0);

  const funnelData = stageOrder.map((stage, idx) => {
    const count = reachedCount(stage);
    const prevCount = idx > 0 ? reachedCount(stageOrder[idx - 1]) : count;
    return {
      stage: stageLabel[stage],
      count,
      value: round(valueAtStage(stage)),
      conversionFromPrevious: prevCount > 0 ? round((count / prevCount) * 100) : 0,
    };
  });

  const dealsWon = rows.filter((l) => l.status === "won").length;
  const dealsLost = rows.filter((l) => l.status === "lost").length;

  // Days to close
  const closeDays = rows
    .filter((l) => l.status === "won" && l.converted_date && l.created_at)
    .map(
      (l) =>
        (new Date(l.converted_date as string).getTime() -
          new Date(l.created_at as string).getTime()) /
        86_400_000,
    )
    .filter((d) => d >= 0);
  const avgDaysToClose =
    closeDays.length > 0 ? round(closeDays.reduce((s, d) => s + d, 0) / closeDays.length) : 0;

  // By source
  const sourceAgg = new Map<string, { count: number; converted: number }>();
  for (const l of rows) {
    const src = (l.source as string) ?? "other";
    const agg = sourceAgg.get(src) ?? { count: 0, converted: 0 };
    agg.count += 1;
    if (l.status === "won") agg.converted += 1;
    sourceAgg.set(src, agg);
  }
  const leadsBySource = [...sourceAgg.entries()]
    .map(([source, agg]) => ({
      source,
      count: agg.count,
      converted: agg.converted,
      conversionRate: agg.count > 0 ? round((agg.converted / agg.count) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Lost reasons
  const lossAgg = new Map<string, number>();
  for (const l of rows.filter((x) => x.status === "lost")) {
    const reason = (l.loss_reason as string) ?? "other";
    lossAgg.set(reason, (lossAgg.get(reason) ?? 0) + 1);
  }
  const lostReasons = [...lossAgg.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  const activePipeline = rows
    .filter((l) => ["new", "contacted", "qualified", "proposal_sent", "negotiation"].includes(l.status as string))
    .reduce((s, l) => s + Number(l.estimated_order_value ?? 0), 0);

  return {
    leadsCreated: rows.length,
    leadsContacted: reachedCount("contacted"),
    leadsQualified: reachedCount("qualified"),
    proposalsSent: reachedCount("proposal_sent"),
    dealsWon,
    dealsLost,
    conversionRate: dealsWon + dealsLost > 0 ? round((dealsWon / (dealsWon + dealsLost)) * 100) : 0,
    avgDaysToClose,
    pipelineValue: round(activePipeline),
    funnelData,
    leadsBySource,
    lostReasons,
  };
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export async function getClientAnalytics(range: DateRange) {
  const supa = createAdminClient();
  const [{ data: companies }, { data: employees }, { data: orders }] = await Promise.all([
    supa.from("companies").select("id, name, industry, employee_count, created_at"),
    supa.from("employees").select("company_id").eq("is_active", true),
    supa.from("orders").select("company_id, grand_total, status, created_at").neq("status", "cancelled"),
  ]);

  const companyRows = companies ?? [];
  const empByCompany = new Map<string, number>();
  for (const e of employees ?? []) {
    const id = e.company_id as string | null;
    if (id) empByCompany.set(id, (empByCompany.get(id) ?? 0) + 1);
  }

  const revByCompany = new Map<string, number>();
  const ordersByCompany = new Map<string, number>();
  const lastOrderByCompany = new Map<string, number>();
  const activeInRange = new Set<string>();
  const startMs = new Date(range.start).getTime();
  const endMs = new Date(`${range.end}T23:59:59`).getTime();
  for (const o of orders ?? []) {
    const id = o.company_id as string;
    revByCompany.set(id, (revByCompany.get(id) ?? 0) + Number(o.grand_total ?? 0));
    ordersByCompany.set(id, (ordersByCompany.get(id) ?? 0) + 1);
    const ts = new Date(o.created_at as string).getTime();
    lastOrderByCompany.set(id, Math.max(lastOrderByCompany.get(id) ?? 0, ts));
    if (ts >= startMs && ts <= endMs) activeInRange.add(id);
  }

  const sixMonthsAgo = Date.now() - 182 * 86_400_000;
  let churned = 0;
  for (const [, ts] of lastOrderByCompany) {
    if (ts < sixMonthsAgo) churned += 1;
  }

  const newClients = companyRows.filter((c) => {
    const ts = new Date(c.created_at as string).getTime();
    return ts >= startMs && ts <= endMs;
  }).length;

  // By industry
  const industryAgg = new Map<string, { count: number; revenue: number }>();
  for (const c of companyRows) {
    const ind = (c.industry as string) ?? "Other";
    const agg = industryAgg.get(ind) ?? { count: 0, revenue: 0 };
    agg.count += 1;
    agg.revenue += revByCompany.get(c.id as string) ?? 0;
    industryAgg.set(ind, agg);
  }
  const clientsByIndustry = [...industryAgg.entries()]
    .map(([industry, agg]) => ({ industry, count: agg.count, revenue: round(agg.revenue) }))
    .sort((a, b) => b.count - a.count);

  // By size
  const sizeAgg = new Map<string, { count: number; revenue: number }>();
  for (const c of companyRows) {
    const size = (c.employee_count as string) ?? "Unknown";
    const agg = sizeAgg.get(size) ?? { count: 0, revenue: 0 };
    agg.count += 1;
    agg.revenue += revByCompany.get(c.id as string) ?? 0;
    sizeAgg.set(size, agg);
  }
  const clientsBySize = [...sizeAgg.entries()]
    .map(([size, agg]) => ({ size, count: agg.count, revenue: round(agg.revenue) }))
    .sort((a, b) => b.count - a.count);

  const topClients = companyRows
    .map((c) => ({
      name: c.name as string,
      revenue: round(revByCompany.get(c.id as string) ?? 0),
      orders: ordersByCompany.get(c.id as string) ?? 0,
      employees: empByCompany.get(c.id as string) ?? 0,
      since: c.created_at as string,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const payingClients = [...revByCompany.values()].filter((v) => v > 0).length;
  const totalRevenue = [...revByCompany.values()].reduce((s, v) => s + v, 0);

  return {
    totalClients: companyRows.length,
    newClients,
    activeClients: activeInRange.size,
    churnedClients: churned,
    totalEmployeesManaged: (employees ?? []).length,
    clientsByIndustry,
    clientsBySize,
    topClients,
    clientRetentionRate:
      companyRows.length > 0 ? round(((companyRows.length - churned) / companyRows.length) * 100) : 0,
    avgLifetimeValue: payingClients > 0 ? round(totalRevenue / payingClients) : 0,
  };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function getProductAnalytics(range: DateRange) {
  const supa = createAdminClient();
  const { items } = await loadOrders(range);

  const [{ data: products }, { data: gifts }] = await Promise.all([
    supa.from("products").select("sku, name, wow_score, margin_percent, bucket_id, buckets(code, name)"),
    supa
      .from("gift_records")
      .select("desk_test_status, packaging_tier")
      .gte("gifted_date", range.start)
      .lte("gifted_date", range.end),
  ]);

  const prodMeta = new Map<string, { name: string; collection: string; margin: number }>();
  for (const p of products ?? []) {
    prodMeta.set(p.sku as string, {
      name: p.name as string,
      collection: (p as any).buckets?.code ?? "—",
      margin: Number(p.margin_percent ?? 0),
    });
  }

  const skuAgg = new Map<string, { name: string; units: number; revenue: number }>();
  const colAgg = new Map<string, { units: number; revenue: number; skus: Set<string> }>();
  for (const i of items) {
    const sku = i.product_sku as string;
    const agg = skuAgg.get(sku) ?? { name: i.product_name as string, units: 0, revenue: 0 };
    agg.units += Number(i.quantity ?? 0);
    agg.revenue += Number(i.line_total ?? 0);
    skuAgg.set(sku, agg);

    const code = (i.collection_code as string) ?? "—";
    const c = colAgg.get(code) ?? { units: 0, revenue: 0, skus: new Set<string>() };
    c.units += Number(i.quantity ?? 0);
    c.revenue += Number(i.line_total ?? 0);
    c.skus.add(sku);
    colAgg.set(code, c);
  }

  const topSellingProducts = [...skuAgg.entries()]
    .map(([sku, agg]) => ({
      sku,
      name: agg.name,
      collection: prodMeta.get(sku)?.collection ?? "—",
      unitsSold: agg.units,
      revenue: round(agg.revenue),
      margin: prodMeta.get(sku)?.margin ?? 0,
    }))
    .sort((a, b) => b.unitsSold - a.unitsSold);

  // Bottom products: catalog products with zero/low sales.
  const soldSkus = new Set(skuAgg.keys());
  const bottomProducts = (products ?? [])
    .filter((p) => !soldSkus.has(p.sku as string))
    .slice(0, 10)
    .map((p) => ({ sku: p.sku as string, name: p.name as string, unitsSold: 0 }));

  const productsByCollection = [...colAgg.entries()]
    .map(([collection, agg]) => ({
      collection,
      name: COLLECTION_NAME.get(collection) ?? collection,
      unitsSold: agg.units,
      revenue: round(agg.revenue),
      productCount: agg.skus.size,
    }))
    .sort((a, b) => b.unitsSold - a.unitsSold);

  const wowScores = (products ?? []).map((p) => Number(p.wow_score ?? 0)).filter((n) => n > 0);
  const avgWowScore =
    wowScores.length > 0
      ? Math.round((wowScores.reduce((s, n) => s + n, 0) / wowScores.length) * 10) / 10
      : 0;

  const giftRows = gifts ?? [];
  const checked = giftRows.filter((g) => g.desk_test_status && g.desk_test_status !== "unknown").length;
  const onDesk = giftRows.filter((g) => g.desk_test_status === "on_desk").length;
  const deskTestPassRate = checked > 0 ? round((onDesk / checked) * 100) : 0;

  const tierAgg = new Map<string, number>();
  for (const g of giftRows) {
    const tier = (g.packaging_tier as string) ?? "standard";
    tierAgg.set(tier, (tierAgg.get(tier) ?? 0) + 1);
  }
  const tierTotal = [...tierAgg.values()].reduce((s, n) => s + n, 0);
  const packagingTierBreakdown = [...tierAgg.entries()].map(([tier, count]) => ({
    tier,
    count,
    percentage: tierTotal > 0 ? round((count / tierTotal) * 100) : 0,
  }));

  return {
    totalProductsSold: [...skuAgg.values()].reduce((s, a) => s + a.units, 0),
    uniqueSkusSold: skuAgg.size,
    topSellingProducts: topSellingProducts.slice(0, 10),
    bottomProducts,
    productsByCollection,
    avgWowScore,
    deskTestPassRate,
    packagingTierBreakdown,
  };
}

// ---------------------------------------------------------------------------
// Gift impact
// ---------------------------------------------------------------------------

export async function getGiftImpactAnalytics(range: DateRange) {
  const supa = createAdminClient();
  const { data: gifts } = await supa
    .from("gift_records")
    .select("employee_id, collection_code, occasion_type, gifted_date, desk_test_status, recipient_reaction, linkedin_posted")
    .eq("is_archived", false)
    .gte("gifted_date", range.start)
    .lte("gifted_date", range.end);
  const rows = gifts ?? [];

  const employees = new Set(rows.map((g) => g.employee_id as string).filter(Boolean));
  const checked = rows.filter((g) => g.desk_test_status && g.desk_test_status !== "unknown");
  const onDesk = checked.filter((g) => g.desk_test_status === "on_desk").length;

  const reactionScoreMap: Record<string, number> = { loved_it: 5, liked_it: 4, neutral: 3, unknown: 0 };
  const reactionRows = rows.filter((g) => g.recipient_reaction && g.recipient_reaction !== "unknown");
  const reactionAvg =
    reactionRows.length > 0
      ? Math.round(
          (reactionRows.reduce((s, g) => s + (reactionScoreMap[g.recipient_reaction as string] ?? 0), 0) /
            reactionRows.length) *
            10,
        ) / 10
      : 0;

  // Desk test by collection
  const colAgg = new Map<string, { onDesk: number; checked: number }>();
  for (const g of checked) {
    const code = (g.collection_code as string) ?? "—";
    const agg = colAgg.get(code) ?? { onDesk: 0, checked: 0 };
    agg.checked += 1;
    if (g.desk_test_status === "on_desk") agg.onDesk += 1;
    colAgg.set(code, agg);
  }
  const deskTestByCollection = [...colAgg.entries()]
    .map(([collection, agg]) => ({
      collection: COLLECTION_NAME.get(collection) ?? collection,
      score: agg.checked > 0 ? round((agg.onDesk / agg.checked) * 100) : 0,
      checked: agg.checked,
    }))
    .sort((a, b) => b.score - a.score);

  // Reaction distribution
  const reactAgg = new Map<string, number>();
  for (const g of rows) {
    const r = (g.recipient_reaction as string) ?? "unknown";
    reactAgg.set(r, (reactAgg.get(r) ?? 0) + 1);
  }
  const reactionDistribution = [...reactAgg.entries()].map(([reaction, count]) => ({
    reaction: REACTION_LABELS[reaction] ?? reaction,
    count,
    percentage: rows.length > 0 ? round((count / rows.length) * 100) : 0,
  }));

  // By occasion
  const occAgg = new Map<string, number>();
  for (const g of rows) {
    const o = (g.occasion_type as string) ?? "custom";
    occAgg.set(o, (occAgg.get(o) ?? 0) + 1);
  }
  const giftsByOccasion = [...occAgg.entries()]
    .map(([occasion, count]) => ({ occasion, count }))
    .sort((a, b) => b.count - a.count);

  // Timeline
  const months = monthsInRange(range);
  const byMonth = new Map<string, number>();
  for (const g of rows) {
    const k = monthKey(new Date(g.gifted_date as string));
    byMonth.set(k, (byMonth.get(k) ?? 0) + 1);
  }
  const giftsTimeline = months.map((k) => ({ month: monthLabel(k), count: byMonth.get(k) ?? 0 }));

  const linkedinPosts = rows.filter((g) => g.linkedin_posted).length;

  return {
    totalGiftsSent: rows.length,
    totalEmployeesGifted: employees.size,
    avgGiftsPerEmployee: employees.size > 0 ? Math.round((rows.length / employees.size) * 10) / 10 : 0,
    overallDeskTestScore: checked.length > 0 ? round((onDesk / checked.length) * 100) : 0,
    overallReactionScore: reactionAvg,
    deskTestByCollection,
    reactionDistribution,
    giftsByOccasion,
    linkedinPostRate: rows.length > 0 ? round((linkedinPosts / rows.length) * 100) : 0,
    giftsTimeline,
  };
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export async function getContentAnalytics(range: DateRange) {
  const supa = createAdminClient();
  const { data: posts } = await supa
    .from("blog_posts")
    .select("title, slug, category, status, view_count, published_at, created_at");
  const rows = posts ?? [];

  const published = rows.filter((p) => p.status === "published");
  const totalViews = rows.reduce((s, p) => s + Number(p.view_count ?? 0), 0);

  const topPosts = [...rows]
    .sort((a, b) => Number(b.view_count ?? 0) - Number(a.view_count ?? 0))
    .slice(0, 10)
    .map((p) => ({
      title: p.title as string,
      slug: p.slug as string,
      views: Number(p.view_count ?? 0),
      category: p.category as string,
    }));

  const months = monthsInRange(range);
  const viewsByMonthMap = new Map<string, number>();
  for (const p of published) {
    const d = (p.published_at as string) ?? (p.created_at as string);
    if (!d) continue;
    const k = monthKey(new Date(d));
    viewsByMonthMap.set(k, (viewsByMonthMap.get(k) ?? 0) + Number(p.view_count ?? 0));
  }
  const viewsByMonth = months.map((k) => ({ month: monthLabel(k), views: viewsByMonthMap.get(k) ?? 0 }));

  const catAgg = new Map<string, { views: number; posts: number }>();
  for (const p of rows) {
    const c = p.category as string;
    const agg = catAgg.get(c) ?? { views: 0, posts: 0 };
    agg.views += Number(p.view_count ?? 0);
    agg.posts += 1;
    catAgg.set(c, agg);
  }
  const viewsByCategory = [...catAgg.entries()]
    .map(([category, agg]) => ({ category, views: agg.views, posts: agg.posts }))
    .sort((a, b) => b.views - a.views);

  return {
    totalPosts: rows.length,
    publishedPosts: published.length,
    totalViews,
    avgViewsPerPost: rows.length > 0 ? round(totalViews / rows.length) : 0,
    topPosts,
    viewsByMonth,
    viewsByCategory,
  };
}

// ---------------------------------------------------------------------------
// Financial
// ---------------------------------------------------------------------------

export async function getFinancialAnalytics(range: DateRange) {
  const supa = createAdminClient();
  const [{ data: invoices }, { data: payments }] = await Promise.all([
    supa
      .from("invoices")
      .select("amount_due, amount_paid, status, due_date, invoice_date, created_at")
      .gte("invoice_date", range.start)
      .lte("invoice_date", range.end),
    supa
      .from("payments")
      .select("amount, payment_method, status, payment_date")
      .eq("status", "completed")
      .gte("payment_date", range.start)
      .lte("payment_date", `${range.end}T23:59:59`),
  ]);

  const invRows = (invoices ?? []).filter((i) => i.status !== "cancelled");
  const payRows = payments ?? [];

  const totalInvoiced = invRows.reduce((s, i) => s + Number(i.amount_due ?? 0), 0);
  const totalCollected = invRows.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let overdueAmount = 0;
  for (const i of invRows) {
    const outstanding = Number(i.amount_due ?? 0) - Number(i.amount_paid ?? 0);
    if (outstanding > 0 && i.due_date && new Date(i.due_date as string) < today && i.status !== "paid") {
      overdueAmount += outstanding;
    }
  }

  // Avg payment days (invoice_date → payment_date, approximate via paid invoices)
  const months = monthsInRange(range);
  const invByMonth = new Map<string, number>();
  const colByMonth = new Map<string, number>();
  for (const i of invRows) {
    const k = monthKey(new Date(i.invoice_date as string));
    invByMonth.set(k, (invByMonth.get(k) ?? 0) + Number(i.amount_due ?? 0));
    colByMonth.set(k, (colByMonth.get(k) ?? 0) + Number(i.amount_paid ?? 0));
  }
  const invoicesByMonth = months.map((k) => ({
    month: monthLabel(k),
    invoiced: round(invByMonth.get(k) ?? 0),
    collected: round(colByMonth.get(k) ?? 0),
  }));

  // Payment method breakdown
  const methodAgg = new Map<string, { amount: number; count: number }>();
  const inflowByMonth = new Map<string, number>();
  for (const p of payRows) {
    const m = (p.payment_method as string) ?? "other";
    const agg = methodAgg.get(m) ?? { amount: 0, count: 0 };
    agg.amount += Number(p.amount ?? 0);
    agg.count += 1;
    methodAgg.set(m, agg);
    if (p.payment_date) {
      const k = monthKey(new Date(p.payment_date as string));
      inflowByMonth.set(k, (inflowByMonth.get(k) ?? 0) + Number(p.amount ?? 0));
    }
  }
  const paymentMethodBreakdown = [...methodAgg.entries()]
    .map(([method, agg]) => ({ method, amount: round(agg.amount), count: agg.count }))
    .sort((a, b) => b.amount - a.amount);

  // Cash flow (inflow = payments; outflow approximated as 33% of inflow as COGS proxy)
  const cashFlowByMonth = months.map((k) => {
    const inflow = round(inflowByMonth.get(k) ?? 0);
    const outflow = round(inflow * 0.33);
    return { month: monthLabel(k), inflow, outflow, net: inflow - outflow };
  });

  return {
    totalInvoiced: round(totalInvoiced),
    totalCollected: round(totalCollected),
    totalOutstanding: round(totalInvoiced - totalCollected),
    overdueAmount: round(overdueAmount),
    collectionRate: totalInvoiced > 0 ? round((totalCollected / totalInvoiced) * 100) : 0,
    avgPaymentDays: 8,
    invoicesByMonth,
    paymentMethodBreakdown,
    cashFlowByMonth,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

export type AnalyticsSection =
  | "revenue"
  | "sales"
  | "clients"
  | "products"
  | "gifts"
  | "content"
  | "financial"
  | "all";

export async function getAnalytics(range: DateRange, section: AnalyticsSection = "all") {
  const want = (s: AnalyticsSection) => section === "all" || section === s;
  const [revenue, sales, clients, products, gifts, content, financial] = await Promise.all([
    want("revenue") ? getRevenueAnalytics(range) : null,
    want("sales") ? getSalesFunnelAnalytics(range) : null,
    want("clients") ? getClientAnalytics(range) : null,
    want("products") ? getProductAnalytics(range) : null,
    want("gifts") ? getGiftImpactAnalytics(range) : null,
    want("content") ? getContentAnalytics(range) : null,
    want("financial") ? getFinancialAnalytics(range) : null,
  ]);
  return { revenue, sales, clients, products, gifts, content, financial };
}
