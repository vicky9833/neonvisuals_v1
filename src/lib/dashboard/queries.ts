import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  getEmployeeCount as employeeCount,
  getUpcomingAnniversaries,
  getUpcomingBirthdays,
} from "@/lib/employees/queries";

/**
 * Server-side dashboard query helpers.
 *
 * Employee-derived data (count, birthdays, anniversaries) now comes from the
 * company-scoped employees table. Quotes/orders remain org-scoped (migration
 * 001) and degrade to 0/[] for freshly onboarded companies. Everything is
 * wrapped in try/catch so the dashboard never throws.
 */

export interface OccasionItem {
  id: string;
  title: string | null;
  date: string;
  occasion_type: string;
  employee_name: string | null;
}

export interface ActivityItem {
  id: string;
  icon: "quote" | "order" | "occasion" | "system";
  description: string;
  timestamp: string;
}

/** Next anniversary of a month/day as an ISO date (this year or next). */
function nextOccurrenceISO(dateStr: string): string | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
  return next.toISOString().slice(0, 10);
}

function yearsSince(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.max(0, new Date().getFullYear() - d.getFullYear());
}

export async function getEmployeeCount(companyId: string): Promise<number> {
  try {
    return await employeeCount(companyId);
  } catch {
    return 0;
  }
}

export async function getGiftsSentCount(companyId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("gift_records")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("is_archived", false);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getUpcomingOccasions(
  companyId: string,
  days: number,
): Promise<OccasionItem[]> {
  try {
    const [birthdays, anniversaries] = await Promise.all([
      getUpcomingBirthdays(companyId, days),
      getUpcomingAnniversaries(companyId, days),
    ]);

    const items: OccasionItem[] = [];
    for (const e of birthdays) {
      const date = e.date_of_birth ? nextOccurrenceISO(e.date_of_birth) : null;
      if (date) {
        items.push({
          id: `bday-${e.id}`,
          title: `${e.name}'s Birthday`,
          date,
          occasion_type: "birthday",
          employee_name: e.name,
        });
      }
    }
    for (const e of anniversaries) {
      const date = e.joining_date ? nextOccurrenceISO(e.joining_date) : null;
      if (date) {
        const years = e.joining_date ? yearsSince(e.joining_date) : 0;
        items.push({
          id: `anniv-${e.id}`,
          title: `${e.name} — ${years} Year Anniversary`,
          date,
          occasion_type: "work_anniversary",
          employee_name: e.name,
        });
      }
    }
    return items.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

export async function getActiveQuotesCount(companyId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("org_id", companyId)
      .in("status", ["draft", "sent"]);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getRecentActivity(
  companyId: string,
  limit: number,
): Promise<ActivityItem[]> {
  try {
    const supabase = await createClient();
    const [quotesRes, giftsRes] = await Promise.all([
      supabase
        .from("quotes")
        .select("id, quote_number, status, created_at")
        .eq("org_id", companyId)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("gift_records")
        .select("id, product_name, occasion_type, created_at, employees(full_name)")
        .eq("company_id", companyId)
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    const quoteItems: ActivityItem[] = (quotesRes.data ?? []).map((q) => ({
      id: `quote-${q.id}`,
      icon: "quote" as const,
      description: `Quote ${q.quote_number ?? ""} was ${
        q.status === "sent" ? "sent" : "created"
      }`.trim(),
      timestamp: q.created_at as string,
    }));

    const giftItems: ActivityItem[] = (giftsRes.data ?? []).map((g) => {
      const emp = (g as { employees?: { full_name?: string } }).employees;
      return {
        id: `gift-${g.id}`,
        icon: "order" as const,
        description: `${g.product_name as string} gifted${
          emp?.full_name ? ` to ${emp.full_name}` : ""
        }`,
        timestamp: g.created_at as string,
      };
    });

    return [...quoteItems, ...giftItems]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function getMonthlyOccasions(
  companyId: string,
  month: number,
  year: number,
): Promise<OccasionItem[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("employees")
      .select("id, full_name, date_of_birth, joining_date")
      .eq("company_id", companyId)
      .eq("is_active", true);

    const items: OccasionItem[] = [];
    for (const e of data ?? []) {
      const name = (e.full_name as string) ?? "Employee";
      const dob = e.date_of_birth as string | null;
      const doj = e.joining_date as string | null;
      if (dob) {
        const d = new Date(dob);
        if (!Number.isNaN(d.getTime()) && d.getMonth() === month) {
          items.push({
            id: `bday-${e.id}`,
            title: `${name}'s Birthday`,
            date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
            occasion_type: "birthday",
            employee_name: name,
          });
        }
      }
      if (doj) {
        const d = new Date(doj);
        if (!Number.isNaN(d.getTime()) && d.getMonth() === month) {
          items.push({
            id: `anniv-${e.id}`,
            title: `${name} — Work Anniversary`,
            date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
            occasion_type: "work_anniversary",
            employee_name: name,
          });
        }
      }
    }
    return items.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}
