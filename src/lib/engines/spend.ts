import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * P9b §R5 — Tenant aggregate-spend engine.
 *
 * Computes a SINGLE company's spend rollup for the client dashboard (the `dashboards.view` surface;
 * finance included per matrix.ts). This is a TENANT-scoped read (RLS via the request client + an
 * explicit company_id filter) — it is NOT the platform/ops analytics module (that lives in
 * analytics.ts and is super_admin-only).
 *
 * AGGREGATE-ONLY BOUNDARY (7c ruling): this NEVER returns a named-per-employee row. It selects
 * employee ids + department ids only (to attribute spend to a department) — never employee names or
 * any employee_pii. Named gift history stays `employees.view_pii`-gated (finance/viewer denied)
 * elsewhere; this surface exposes totals + department/occasion rollups, nothing identifying.
 *
 * DEMO ORGS: no is_demo filter here — the read is scoped to the ONE viewing company. A real org sees
 * only its own (non-demo) spend by construction; a demo org's own dashboard shows its own sandbox
 * spend. Cross-company/platform demo exclusion lives in analytics.ts + the reminders cron (§R3).
 */

export interface DepartmentSpend {
  department: string;
  spend: number;
  giftCount: number;
}

export interface OccasionSpend {
  occasion: string;
  spend: number;
  giftCount: number;
}

export interface CompanySpendSummary {
  /** Sum of orders.grand_total (non-cancelled) — the headline order value. */
  totalOrderValue: number;
  totalOrders: number;
  /** Count of gift_records (delivered/recorded gifts). */
  totalGifts: number;
  /** Attributable gift spend (sum of gift_records.unit_price). */
  totalGiftSpend: number;
  /** Per-department rollup from gift_records → employee.department_id (aggregate; no names). */
  byDepartment: DepartmentSpend[];
  /** Per-occasion rollup from gift_records.occasion_type (aggregate). */
  byOccasion: OccasionSpend[];
}

function round(n: number): number {
  return Math.round(n);
}

const UNASSIGNED = "Unassigned";

export async function getCompanySpendSummary(
  companyId: string,
  client?: SupabaseClient,
): Promise<CompanySpendSummary> {
  // RLS client by default (page path); callers/tests may inject a client. The explicit company_id
  // filter below scopes every read to the one company regardless of which client is passed.
  const supa = client ?? (await createClient());

  // RLS scopes each table to the caller's company; the explicit company_id filter is defense-in-depth.
  const [{ data: orders }, { data: gifts }, { data: employees }, { data: departments }] =
    await Promise.all([
      supa
        .from("orders")
        .select("grand_total, status")
        .eq("company_id", companyId)
        .neq("status", "cancelled"),
      // employee_id is an opaque id (not PII); unit_price + occasion_type drive the aggregates.
      supa
        .from("gift_records")
        .select("employee_id, unit_price, occasion_type")
        .eq("company_id", companyId)
        .eq("is_archived", false),
      supa.from("employees").select("id, department_id").eq("company_id", companyId),
      supa.from("departments").select("id, name").eq("company_id", companyId),
    ]);

  const orderRows = orders ?? [];
  const giftRows = gifts ?? [];

  const totalOrderValue = orderRows.reduce((s, o) => s + Number(o.grand_total ?? 0), 0);
  const totalGiftSpend = giftRows.reduce((s, g) => s + Number(g.unit_price ?? 0), 0);

  const deptNameById = new Map<string, string>(
    (departments ?? []).map((d) => [d.id as string, d.name as string]),
  );
  const deptByEmployee = new Map<string, string | null>(
    (employees ?? []).map((e) => [e.id as string, (e.department_id as string | null) ?? null]),
  );

  const deptAgg = new Map<string, { spend: number; giftCount: number }>();
  const occAgg = new Map<string, { spend: number; giftCount: number }>();
  for (const g of giftRows) {
    const price = Number(g.unit_price ?? 0);

    const deptId = deptByEmployee.get(g.employee_id as string) ?? null;
    const deptName = deptId ? (deptNameById.get(deptId) ?? UNASSIGNED) : UNASSIGNED;
    const d = deptAgg.get(deptName) ?? { spend: 0, giftCount: 0 };
    d.spend += price;
    d.giftCount += 1;
    deptAgg.set(deptName, d);

    const occ = (g.occasion_type as string) ?? "custom";
    const o = occAgg.get(occ) ?? { spend: 0, giftCount: 0 };
    o.spend += price;
    o.giftCount += 1;
    occAgg.set(occ, o);
  }

  const byDepartment: DepartmentSpend[] = [...deptAgg.entries()]
    .map(([department, agg]) => ({ department, spend: round(agg.spend), giftCount: agg.giftCount }))
    .sort((a, b) => b.spend - a.spend);

  const byOccasion: OccasionSpend[] = [...occAgg.entries()]
    .map(([occasion, agg]) => ({ occasion, spend: round(agg.spend), giftCount: agg.giftCount }))
    .sort((a, b) => b.spend - a.spend);

  return {
    totalOrderValue: round(totalOrderValue),
    totalOrders: orderRows.length,
    totalGifts: giftRows.length,
    totalGiftSpend: round(totalGiftSpend),
    byDepartment,
    byOccasion,
  };
}
