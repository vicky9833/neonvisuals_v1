import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCalendarEvents } from "@/lib/engines/occasions";

/**
 * Occasion auto-generation engine (Prompt 5b). WRITES occasions instances with
 * per-type lead_days + a blackout-adjusted notify_date + rush flag. Reminders
 * become a DOWNSTREAM consumer of these instances (see occasions.generateReminders).
 *
 * EQUIVALENCE: the SHARED occasion types (birthday, work_anniversary, festival,
 * custom) are enumerated from the SAME computation the old engine used
 * (occasions.getCalendarEvents) — so the migration cannot silently drop or invent
 * a shared occasion. The §4A additions (milestone, onboarding, probation) are the
 * intended PLUS, computed from joining_date here.
 */

const HORIZON_DAYS = 365;
// §4A milestone years (ruling: 5/10/15/20). At these years the milestone_anniversary
// REPLACES the plain work_anniversary (premium/T-30) — not both (no double-gifting).
// Years 1/3 (and all non-milestone years) get the regular T-14 work_anniversary.
const MILESTONE_YEARS = [5, 10, 15, 20];
// Probation completion period. DEFAULT 90 days; per-company configurability is a P8 settings
// seam (§4A "configurable period") — do not treat 90 as the only possible value.
const PROBATION_DAYS = 90;

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return iso(d);
}
function addDaysISO(base: string, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return iso(d);
}

/**
 * notify_date = leadDays NON-blackout days before the occasion (production can't
 * happen on a blackout day, so the order-by date moves earlier to skip them).
 * rush = the notify_date has already passed (we're inside the lead window).
 */
export function computeNotify(
  occasionISO: string,
  leadDays: number,
  blackout: Set<string>,
  today: string,
): { notify: string; rush: boolean } {
  const d = new Date(occasionISO);
  let counted = 0;
  let guard = 0;
  while (counted < leadDays && guard < 1000) {
    d.setDate(d.getDate() - 1);
    if (!blackout.has(iso(d))) counted += 1;
    guard += 1;
  }
  const notify = iso(d);
  return { notify, rush: notify <= today };
}

/** Next anniversary of `doj` on/after today (+ its year-count), or null if beyond horizon. */
function nextAnniversary(dojISO: string, today: string, end: string): { date: string; years: number } | null {
  const doj = new Date(dojISO);
  const t = new Date(today);
  let year = t.getFullYear();
  let cand = iso(new Date(year, doj.getMonth(), doj.getDate()));
  if (cand < today) {
    year += 1;
    cand = iso(new Date(year, doj.getMonth(), doj.getDate()));
  }
  if (cand > end) return null;
  return { date: cand, years: year - doj.getFullYear() };
}

export interface OccasionGenResult {
  generated: number;
  missingJoiningDate: number;
  rush: number;
}

export async function generateOccasions(
  companyId: string,
  client?: SupabaseClient,
): Promise<OccasionGenResult> {
  const supabase = client ?? (await createClient());
  const today = todayISO();
  const end = addDaysISO(today, HORIZON_DAYS);

  const { data: types } = await supabase.from("occasion_types").select("key, default_lead_days, is_sensitive");
  const typeCfg = new Map<string, { lead: number; sensitive: boolean }>(
    (types ?? []).map((t) => [t.key as string, { lead: t.default_lead_days as number, sensitive: t.is_sensitive as boolean }]),
  );
  const leadOf = (key: string, fallback: number) => typeCfg.get(key)?.lead ?? fallback;

  // Blackout set: org (companies.blackout_dates) + platform (production/delivery).
  const { data: company } = await supabase.from("companies").select("blackout_dates").eq("id", companyId).maybeSingle();
  const { data: platBlackout } = await supabase.from("platform_blackout_dates").select("date");
  const blackout = new Set<string>([
    ...(((company?.blackout_dates as string[]) ?? [])),
    ...(((platBlackout ?? []).map((b) => b.date as string))),
  ]);

  const { data: fests } = await supabase.from("festival_calendar").select("id, default_lead_days");
  const festLead = new Map<string, number>((fests ?? []).map((f) => [f.id as string, (f.default_lead_days as number) ?? 30]));

  const rows: Record<string, unknown>[] = [];
  let rush = 0;
  const pushRow = (r: Record<string, unknown>) => { if (r.is_rush) rush += 1; rows.push(r); };

  // ---- Load employees FIRST so we can precompute milestone anniversaries ----
  const { data: emps } = await supabase
    .from("employees")
    .select("id, full_name, joining_date")
    .eq("company_id", companyId)
    .eq("is_active", true);

  // Precompute per-employee next anniversary + whether it is a milestone year.
  // suppressSet holds `${employeeId}|${date}` for anniversaries whose year-count is a
  // milestone: at those the milestone_anniversary REPLACES the plain work_anniversary
  // (ruling: no double-gift). Non-milestone anniversaries fall through unchanged (exact
  // equivalence with the old engine preserved).
  const annivByEmp = new Map<string, { date: string; years: number }>();
  const suppressSet = new Set<string>();
  for (const emp of emps ?? []) {
    const doj = emp.joining_date as string | null;
    if (!doj) continue;
    const anniv = nextAnniversary(doj, today, end);
    if (!anniv) continue;
    annivByEmp.set(emp.id as string, anniv);
    if (MILESTONE_YEARS.includes(anniv.years)) {
      suppressSet.add(`${emp.id as string}|${anniv.date}`);
    }
  }

  // ---- SHARED types (birthday, work_anniversary, festival, custom) via the OLD computation ----
  const events = await getCalendarEvents(companyId, today, end, client);
  for (const e of events) {
    // Milestone-year suppression: skip the plain work_anniversary the old engine emitted
    // at a milestone year — the premium milestone_anniversary (below) replaces it. This is
    // an INTENDED divergence from strict equivalence (documented in verify5b/1_equivalence.md);
    // all non-milestone-year anniversaries pass through untouched.
    if (e.type === "work_anniversary" && e.employeeId && suppressSet.has(`${e.employeeId}|${e.date}`)) {
      continue;
    }
    let key: string;
    let lead: number;
    if (e.type === "birthday") { key = "birthday"; lead = leadOf("birthday", 14); }
    else if (e.type === "work_anniversary") { key = "work_anniversary"; lead = leadOf("work_anniversary", 14); }
    else if (e.type === "festival") { key = "festival"; lead = (e.festivalId ? festLead.get(e.festivalId) : undefined) ?? leadOf("festival", 30); }
    else { key = "custom"; lead = leadOf("custom", 14); }

    const { notify, rush: r } = computeNotify(e.date, lead, blackout, today);
    let recurMonth: number | null = null;
    let recurDay: number | null = null;
    let recurrence = "none";
    if (e.type === "birthday") {
      const [mm, dd] = (e.originalDate ?? "").split("-");
      recurMonth = Number(mm) || null;
      recurDay = Number(dd) || null;
      recurrence = "annual";
    } else if (e.type === "work_anniversary") {
      recurrence = "annual";
    }
    pushRow({
      company_id: companyId, employee_id: e.employeeId ?? null, occasion_type_key: key,
      title: e.title, date: e.date, recur_month: recurMonth, recur_day: recurDay,
      lead_days: lead, recurrence, is_company_wide: !e.employeeId, budget: null,
      status: "upcoming", auto_generated: true, is_sensitive: typeCfg.get(key)?.sensitive ?? false,
      notify_date: notify, is_rush: r,
    });
  }

  // ---- §4A additions from joining_date: onboarding, probation, milestone ----
  let missingJoiningDate = 0;
  for (const emp of emps ?? []) {
    const doj = emp.joining_date as string | null;
    if (!doj) { missingJoiningDate += 1; continue; } // birthday still generated above; skip DOJ-derived
    const name = (emp.full_name as string) ?? "Employee";

    // Onboarding / Day-One: only for an UPCOMING joiner within horizon. Lead 5 BEFORE joining.
    if (doj >= today && doj <= end) {
      const lead = leadOf("onboarding", 5);
      const { notify, rush: r } = computeNotify(doj, lead, blackout, today);
      pushRow({ company_id: companyId, employee_id: emp.id, occasion_type_key: "onboarding", title: `${name} — Onboarding`, date: doj, recur_month: null, recur_day: null, lead_days: lead, recurrence: "none", is_company_wide: false, status: "upcoming", auto_generated: true, is_sensitive: false, notify_date: notify, is_rush: r });
    }
    // Probation completion: joining + PROBATION_DAYS, within horizon. Lead 7.
    const prob = addDaysISO(doj, PROBATION_DAYS);
    if (prob >= today && prob <= end) {
      const lead = leadOf("probation_completion", 7);
      const { notify, rush: r } = computeNotify(prob, lead, blackout, today);
      pushRow({ company_id: companyId, employee_id: emp.id, occasion_type_key: "probation_completion", title: `${name} — Probation Completion`, date: prob, recur_month: null, recur_day: null, lead_days: lead, recurrence: "none", is_company_wide: false, status: "upcoming", auto_generated: true, is_sensitive: false, notify_date: notify, is_rush: r });
    }
    // Milestone anniversary: reuse the precomputed next anniversary; emit only at milestone
    // years (the plain work_anniversary was suppressed above for these). Lead 30.
    const anniv = annivByEmp.get(emp.id as string);
    if (anniv && MILESTONE_YEARS.includes(anniv.years)) {
      const lead = leadOf("milestone_anniversary", 30);
      const { notify, rush: r } = computeNotify(anniv.date, lead, blackout, today);
      pushRow({ company_id: companyId, employee_id: emp.id, occasion_type_key: "milestone_anniversary", title: `${name} — ${anniv.years} Year Milestone`, date: anniv.date, recur_month: null, recur_day: null, lead_days: lead, recurrence: "none", is_company_wide: false, status: "upcoming", auto_generated: true, is_sensitive: false, notify_date: notify, is_rush: r });
    }
  }

  // Idempotent regen: replace auto-generated occasions, preserve manual ones.
  await supabase.from("occasions").delete().eq("company_id", companyId).eq("auto_generated", true);
  if (rows.length > 0) {
    const { error } = await supabase.from("occasions").insert(rows);
    if (error) throw new Error(error.message);
  }
  return { generated: rows.length, missingJoiningDate, rush };
}
