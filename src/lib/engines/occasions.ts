import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  EVENT_COLORS,
  type CalendarEvent,
  type CalendarEventType,
  type FestivalPreference,
  type Reminder,
} from "@/types/occasion";

/**
 * Most functions accept an optional Supabase client. Default = request-scoped
 * cookie client (RLS-enforced, used on dashboard load). The cron passes a
 * service-role client so it can process EVERY company cross-tenant.
 */

/**
 * Occasion engine - aggregates employee birthdays, work anniversaries,
 * company-tracked festivals, and custom occasions into a unified calendar,
 * and generates dashboard reminders. Company-scoped via the RLS client.
 */

const DAY_MS = 86_400_000;

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parse(d: string): Date {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function today(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

/** Occurrences of a recurring (month/day-anchored) date within [start,end]. */
function occurrencesInRange(
  base: Date,
  stepMonths: number,
  start: Date,
  end: Date,
): string[] {
  const out: string[] = [];
  if (stepMonths === 0) {
    if (base >= start && base <= end) out.push(toISO(base));
    return out;
  }
  // Walk candidate occurrences anchored on the base month/day.
  const day = base.getDate();
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  // Align cursor's month offset to the base cadence.
  const monthsFromBase =
    (cursor.getFullYear() - base.getFullYear()) * 12 +
    (cursor.getMonth() - base.getMonth());
  const back = ((monthsFromBase % stepMonths) + stepMonths) % stepMonths;
  cursor = new Date(
    cursor.getFullYear(),
    cursor.getMonth() - back,
    1,
  );
  for (let i = 0; i < 64; i += 1) {
    const monthDays = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      0,
    ).getDate();
    const occ = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      Math.min(day, monthDays),
    );
    if (occ > end) break;
    if (occ >= start) out.push(toISO(occ));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + stepMonths, 1);
  }
  return out;
}

function anniversarySuggestion(years: number): {
  collection: string;
  product?: string;
} {
  if (years <= 1) return { collection: "B", product: "NV-B01" };
  if (years <= 3) return { collection: "B", product: "NV-B03" };
  if (years <= 5) return { collection: "B", product: "NV-B05" };
  return { collection: "B", product: "NV-B09" };
}

function buildActionUrl(type: CalendarEventType, label: string): string {
  const params = new URLSearchParams({ occasion: type, for: label });
  return `/gift-builder?${params.toString()}`;
}

export async function getCalendarEvents(
  companyId: string,
  startDate: string,
  endDate: string,
  client?: SupabaseClient,
): Promise<CalendarEvent[]> {
  const supabase = client ?? (await createClient());
  const start = parse(startDate);
  const end = parse(endDate);
  const events: CalendarEvent[] = [];

  // 1 + 2. Employee birthdays + anniversaries. dob now lives in employee_pii
  // (RLS-gated; the cron's service-role client sees all, a user client sees only
  // §6A-permitted rows). department name resolves via the departments FK.
  const { data: employees } = await supabase
    .from("employees")
    .select(
      "id, full_name, joining_date, department:departments(name), pii:employee_pii(dob_day, dob_month)",
    )
    .eq("company_id", companyId)
    .eq("is_active", true);

  for (const e of employees ?? []) {
    const name = (e.full_name as string) ?? "Employee";
    const deptRel = e.department as unknown as { name: string | null } | null;
    const dept = deptRel?.name ?? undefined;
    const piiRel = e.pii as unknown as { dob_day: number | null; dob_month: number | null } | null;
    const dobDay = piiRel?.dob_day ?? null;
    const dobMonth = piiRel?.dob_month ?? null;
    const doj = e.joining_date as string | null;

    if (dobMonth && dobDay) {
      // Birth YEAR is not stored; anchor on a fixed year purely to expand the
      // recurring month/day. Age (yearsCount) is intentionally omitted.
      const baseDob = new Date(2000, dobMonth - 1, dobDay);
      for (const iso of occurrencesInRange(baseDob, 12, start, end)) {
        events.push({
          id: `bday-${e.id}-${iso}`,
          type: "birthday",
          title: `${name}'s Birthday`,
          description: dept ? `${dept}` : undefined,
          date: iso,
          originalDate: `${String(dobMonth).padStart(2, "0")}-${String(dobDay).padStart(2, "0")}`,
          yearsCount: undefined,
          employeeId: e.id as string,
          employeeName: name,
          employeeDepartment: dept,
          recurrence: "yearly",
          suggestedCollection: "I",
          suggestedAction: "Plan a Gift",
          actionUrl: buildActionUrl("birthday", name),
          color: EVENT_COLORS.birthday,
        });
      }
    }

    if (doj) {
      const baseDoj = parse(doj);
      for (const iso of occurrencesInRange(baseDoj, 12, start, end)) {
        const years = new Date(iso).getFullYear() - baseDoj.getFullYear();
        if (years < 1) continue;
        const s = anniversarySuggestion(years);
        events.push({
          id: `anniv-${e.id}-${iso}`,
          type: "work_anniversary",
          title: `${name} - ${years} Year Work Anniversary`,
          description: dept ? `${dept}` : undefined,
          date: iso,
          originalDate: doj,
          yearsCount: years,
          employeeId: e.id as string,
          employeeName: name,
          employeeDepartment: dept,
          recurrence: "yearly",
          suggestedCollection: s.collection,
          suggestedProduct: s.product,
          suggestedAction: "Plan a Gift",
          actionUrl: buildActionUrl("work_anniversary", name),
          color: EVENT_COLORS.work_anniversary,
        });
      }
    }
  }

  // 3. Festivals (company-tracked; default-on when no preference row exists).
  const { data: festivals } = await supabase
    .from("festival_calendar")
    .select("id, name, date, description")
    .gte("date", startDate)
    .lte("date", endDate)
    .eq("is_active", true);

  const { data: prefs } = await supabase
    .from("company_festivals")
    .select("festival_id, is_active, custom_date")
    .eq("company_id", companyId);
  const prefMap = new Map(
    (prefs ?? []).map((p) => [
      p.festival_id as string,
      { active: p.is_active as boolean, custom: p.custom_date as string | null },
    ]),
  );

  for (const f of festivals ?? []) {
    const pref = prefMap.get(f.id as string);
    if (pref && !pref.active) continue; // explicitly disabled
    const date = pref?.custom ?? (f.date as string);
    if (date < startDate || date > endDate) continue;
    events.push({
      id: `festival-${f.id}-${date}`,
      type: "festival",
      title: f.name as string,
      description: (f.description as string | null) ?? "Festival",
      date,
      festivalId: f.id as string,
      recurrence: "yearly",
      suggestedCollection: "D",
      suggestedAction: "Plan Festive Gifting",
      actionUrl: buildActionUrl("festival", f.name as string),
      color: EVENT_COLORS.festival,
    });
  }

  // 4. Custom occasions (with recurrence expansion).
  const { data: customs } = await supabase
    .from("custom_occasions")
    .select(
      "id, title, description, occasion_date, recurrence, occasion_type, employee_ids",
    )
    .eq("company_id", companyId)
    .eq("is_active", true);

  for (const c of customs ?? []) {
    const base = parse(c.occasion_date as string);
    const recurrence = c.recurrence as string;
    const step =
      recurrence === "yearly"
        ? 12
        : recurrence === "quarterly"
          ? 3
          : recurrence === "monthly"
            ? 1
            : 0;
    const empCount = Array.isArray(c.employee_ids)
      ? (c.employee_ids as string[]).length
      : 0;
    for (const iso of occurrencesInRange(base, step, start, end)) {
      events.push({
        id: `custom-${c.id}-${iso}`,
        type: "custom",
        title: c.title as string,
        description:
          (c.description as string | null) ??
          (empCount > 0 ? `${empCount} employees` : "Company event"),
        date: iso,
        originalDate: c.occasion_date as string,
        customOccasionId: c.id as string,
        recurrence:
          step === 12
            ? "yearly"
            : step === 3
              ? "quarterly"
              : step === 1
                ? "monthly"
                : "one-time",
        suggestedCollection: "I",
        suggestedAction: "Plan Event Gifts",
        actionUrl: buildActionUrl("custom", c.title as string),
        color: EVENT_COLORS.custom,
      });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getUpcomingEvents(
  companyId: string,
  days: number,
  client?: SupabaseClient,
): Promise<CalendarEvent[]> {
  const start = today();
  return getCalendarEvents(
    companyId,
    toISO(start),
    toISO(addDays(start, days)),
    client,
  );
}

export async function getEventsForDate(
  companyId: string,
  date: string,
): Promise<CalendarEvent[]> {
  return getCalendarEvents(companyId, date, date);
}

export async function getEventsForMonth(
  companyId: string,
  month: number,
  year: number,
): Promise<CalendarEvent[]> {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return getCalendarEvents(companyId, toISO(start), toISO(end));
}

export async function getEventsByType(
  companyId: string,
  type: CalendarEventType,
  days: number,
): Promise<CalendarEvent[]> {
  const events = await getUpcomingEvents(companyId, days);
  return events.filter((e) => e.type === type);
}

// ---------- Festival preferences --------------------------------------------

export async function getFestivalPreferences(
  companyId: string,
): Promise<FestivalPreference[]> {
  const supabase = await createClient();
  const { data: festivals } = await supabase
    .from("festival_calendar")
    .select("id, name, date, description")
    .eq("is_active", true)
    .order("date", { ascending: true });

  const { data: prefs } = await supabase
    .from("company_festivals")
    .select("festival_id, is_active, custom_date")
    .eq("company_id", companyId);
  const prefMap = new Map(
    (prefs ?? []).map((p) => [p.festival_id as string, p]),
  );

  return (festivals ?? []).map((f) => {
    const pref = prefMap.get(f.id as string);
    const custom = (pref?.custom_date as string | null) ?? null;
    return {
      festival_id: f.id as string,
      name: f.name as string,
      default_date: f.date as string,
      effective_date: custom ?? (f.date as string),
      // Default-on when no preference row exists yet.
      is_active: pref ? (pref.is_active as boolean) : true,
      custom_date: custom,
      description: (f.description as string | null) ?? null,
    };
  });
}

export async function saveFestivalPreferences(
  companyId: string,
  prefs: Array<{ festival_id: string; is_active: boolean; custom_date?: string | null }>,
): Promise<void> {
  const supabase = await createClient();
  const rows = prefs.map((p) => ({
    company_id: companyId,
    festival_id: p.festival_id,
    is_active: p.is_active,
    custom_date: p.custom_date ?? null,
  }));
  const { error } = await supabase
    .from("company_festivals")
    .upsert(rows, { onConflict: "company_id,festival_id" });
  if (error) throw new Error(error.message);
}

// ---------- Reminders --------------------------------------------------------

export async function generateReminders(
  companyId: string,
  client?: SupabaseClient,
): Promise<{ created: number; skipped: number }> {
  const supabase = client ?? (await createClient());
  const now = today();
  const todayISO = toISO(now);

  // Debounce: skip if reminders were already generated today.
  const { data: recent } = await supabase
    .from("reminders")
    .select("created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (recent && recent[0]) {
    const last = new Date(recent[0].created_at as string);
    if (toISO(last) === todayISO) {
      // Still auto-expire stale reminders, then exit.
      await supabase
        .from("reminders")
        .update({ is_dismissed: true })
        .eq("company_id", companyId)
        .lt("occasion_date", toISO(addDays(now, -7)))
        .eq("is_dismissed", false);
      return { created: 0, skipped: 0 };
    }
  }

  // Prompt 5b CUTOVER: reminders are now a DOWNSTREAM CONSUMER of occasions instances.
  // We no longer recompute occasions here — we read their lead-adjusted notify_date.
  // occasions are (re)generated upstream by generateOccasions() before this runs.
  const { data: occ } = await supabase
    .from("occasions")
    .select("occasion_type_key, title, date, notify_date, employee_id")
    .eq("company_id", companyId)
    .not("notify_date", "is", null)
    .gte("notify_date", toISO(addDays(now, -7)));

  // Existing reminders to dedupe against.
  const { data: existing } = await supabase
    .from("reminders")
    .select("reminder_type, occasion_date, reminder_date, employee_id, festival_id, custom_occasion_id")
    .eq("company_id", companyId)
    .gte("reminder_date", toISO(addDays(now, -7)));
  const key = (r: {
    reminder_type: string;
    occasion_date: string;
    reminder_date: string;
    employee_id?: string | null;
    festival_id?: string | null;
    custom_occasion_id?: string | null;
  }) =>
    [
      r.reminder_type,
      r.occasion_date,
      r.reminder_date,
      r.employee_id ?? "",
      r.festival_id ?? "",
      r.custom_occasion_id ?? "",
    ].join("|");
  const seen = new Set((existing ?? []).map((r) => key(r as never)));

  // occasion_type_key -> reminders.reminder_type (CHECK: birthday|work_anniversary|festival|custom_occasion).
  const reminderType = (k: string): Reminder["reminder_type"] =>
    k === "birthday" ? "birthday" : k === "festival" ? "festival" : k === "custom" ? "custom_occasion" : "work_anniversary";

  const toInsert: Record<string, unknown>[] = [];
  let skipped = 0;

  for (const o of occ ?? []) {
    const occasionDate = (o.date as string) ?? (o.notify_date as string);
    const row = {
      company_id: companyId,
      reminder_type: reminderType(o.occasion_type_key as string),
      title: o.title as string,
      description: null,
      occasion_date: occasionDate,
      reminder_date: o.notify_date as string,
      employee_id: (o.employee_id as string | null) ?? null,
      festival_id: null,
      custom_occasion_id: null,
      action_url: null,
    };
    if (seen.has(key(row as never))) {
      skipped += 1;
      continue;
    }
    seen.add(key(row as never));
    toInsert.push(row);
  }

  let created = 0;
  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from("reminders")
      .insert(toInsert)
      .select("id");
    if (!error) created = data?.length ?? 0;
  }

  // Auto-expire reminders for occasions more than 7 days past.
  await supabase
    .from("reminders")
    .update({ is_dismissed: true })
    .eq("company_id", companyId)
    .lt("occasion_date", toISO(addDays(now, -7)))
    .eq("is_dismissed", false);

  return { created, skipped };
}

export async function getActiveReminders(
  companyId: string,
  client?: SupabaseClient,
): Promise<Reminder[]> {
  const supabase = client ?? (await createClient());
  const now = todayString();
  const { data } = await supabase
    .from("reminders")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_dismissed", false)
    .lte("reminder_date", now)
    .order("occasion_date", { ascending: true });

  // Dedupe to one card per occasion (keep the most recently triggered).
  const byOccasion = new Map<string, Reminder>();
  for (const r of (data ?? []) as Reminder[]) {
    const k = [
      r.reminder_type,
      r.occasion_date,
      r.employee_id ?? "",
      r.festival_id ?? "",
      r.custom_occasion_id ?? "",
    ].join("|");
    const prev = byOccasion.get(k);
    if (!prev || r.reminder_date > prev.reminder_date) byOccasion.set(k, r);
  }
  return [...byOccasion.values()].sort((a, b) =>
    a.occasion_date.localeCompare(b.occasion_date),
  );
}

function todayString(): string {
  return toISO(today());
}

export async function markReminderRead(reminderId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("reminders").update({ is_read: true }).eq("id", reminderId);
}
export async function markReminderDismissed(reminderId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("reminders")
    .update({ is_dismissed: true })
    .eq("id", reminderId);
}
export async function markReminderActioned(reminderId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("reminders")
    .update({ is_actioned: true, is_read: true })
    .eq("id", reminderId);
}
