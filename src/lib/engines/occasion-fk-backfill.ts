import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * P9a one-time backfill resolver: company-wide occasion (type, title, date) -> immutable FK.
 *
 * BUILD-TIME DEAD but KEPT correct-if-woken (CTO ruling): real data has zero pre-cutover cw rows,
 * and new rows are BORN with the FK via the generator (no title->id lookup). This resolver exists
 * so that IF any environment ever holds a pre-cutover cw row, the resolution path is proven, not
 * theoretical — it is exercised on synthetic rows in the P9a smoke.
 *
 * A festival resolves by (name, date) against festival_calendar (name+date is unique). A custom
 * occasion resolves by (company_id, title, occasion_date) against custom_occasions. `unresolved`
 * (zero matches) and `ambiguous` (>1 match) are BOTH surfaced so the caller HARD-STOPS rather than
 * guessing or writing a degenerate key.
 */
export interface FkResolution {
  festivalId: string | null;
  customOccasionId: string | null;
  unresolved: boolean; // zero matches
  ambiguous: boolean; // >1 match (1-to-many) — HARD STOP
}

export async function resolveCwOccasionFk(
  client: SupabaseClient,
  input: { companyId: string; occasionTypeKey: string; title: string | null; date: string },
): Promise<FkResolution> {
  if (input.occasionTypeKey === "festival") {
    const { data } = await client
      .from("festival_calendar")
      .select("id")
      .eq("name", input.title ?? "")
      .eq("date", input.date);
    const rows = data ?? [];
    if (rows.length === 0) return { festivalId: null, customOccasionId: null, unresolved: true, ambiguous: false };
    if (rows.length > 1) return { festivalId: null, customOccasionId: null, unresolved: false, ambiguous: true };
    return { festivalId: rows[0].id as string, customOccasionId: null, unresolved: false, ambiguous: false };
  }
  // custom (company-scoped). NOTE: recurring customs expand to dates != occasion_date; this exact
  // match is the one-time base-row resolver (dead path today). New rows carry the FK directly.
  const { data } = await client
    .from("custom_occasions")
    .select("id")
    .eq("company_id", input.companyId)
    .eq("title", input.title ?? "")
    .eq("occasion_date", input.date);
  const rows = data ?? [];
  if (rows.length === 0) return { festivalId: null, customOccasionId: null, unresolved: true, ambiguous: false };
  if (rows.length > 1) return { festivalId: null, customOccasionId: null, unresolved: false, ambiguous: true };
  return { festivalId: null, customOccasionId: rows[0].id as string, unresolved: false, ambiguous: false };
}
