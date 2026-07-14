import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  REACTION_SCORE,
  type EmployeePreferences,
  type GiftRecord,
  type GiftRecordInput,
} from "@/types/gift";

/**
 * Memory Engine - the permanent institutional record of every gift sent, plus
 * the learned per-employee preferences that drive duplicate detection and
 * recommendations. Company-scoped via the RLS client.
 */

// ---------- Gift history -----------------------------------------------------

export async function getEmployeeGiftHistory(
  employeeId: string,
): Promise<GiftRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gift_records")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("is_archived", false)
    .order("gifted_date", { ascending: false });
  return (data ?? []) as GiftRecord[];
}

export interface CompanyGiftHistoryOptions {
  employeeId?: string;
  occasionType?: string;
  productSku?: string;
  dateRange?: { start: string; end: string };
  collectionCode?: string;
  page?: number;
  pageSize?: number;
}

export async function getCompanyGiftHistory(
  companyId: string,
  options: CompanyGiftHistoryOptions = {},
): Promise<{ records: GiftRecord[]; total: number }> {
  const { page = 1, pageSize = 25 } = options;
  const supabase = await createClient();
  let query = supabase
    .from("gift_records")
    .select("*, employees(full_name, department)", { count: "exact" })
    .eq("company_id", companyId)
    .eq("is_archived", false);

  if (options.employeeId) query = query.eq("employee_id", options.employeeId);
  if (options.occasionType) query = query.eq("occasion_type", options.occasionType);
  if (options.productSku) query = query.eq("product_sku", options.productSku);
  if (options.collectionCode)
    query = query.eq("collection_code", options.collectionCode);
  if (options.dateRange) {
    query = query
      .gte("gifted_date", options.dateRange.start)
      .lte("gifted_date", options.dateRange.end);
  }

  query = query.order("gifted_date", { ascending: false });
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const records = (data ?? []).map((r) => {
    const emp = (r as { employees?: { full_name?: string; department?: string } })
      .employees;
    return {
      ...(r as GiftRecord),
      employee_name: emp?.full_name,
      employee_department: emp?.department ?? null,
    };
  });
  return { records, total: count ?? 0 };
}

export async function recordGift(
  companyId: string,
  createdBy: string,
  input: GiftRecordInput,
): Promise<GiftRecord> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gift_records")
    .insert({
      company_id: companyId,
      employee_id: input.employeeId,
      product_sku: input.productSku,
      product_name: input.productName,
      collection_code: input.collectionCode ?? null,
      occasion_type: input.occasionType,
      occasion_label: input.occasionLabel ?? null,
      gifted_date: input.giftedDate,
      packaging_tier: input.packagingTier ?? null,
      personalisation_level: input.personalisationLevel ?? null,
      narrative_message: input.narrativeMessage ?? null,
      engraving_text: input.engravingText ?? null,
      delivery_status: input.deliveryStatus ?? "pending",
      delivered_date: input.deliveredDate ?? null,
      unit_cost: input.unitCost ?? null,
      unit_price: input.unitPrice ?? null,
      created_by: createdBy,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await recalcPreferences(companyId, input.employeeId);
  return data as GiftRecord;
}

export async function updateGiftFeedback(
  giftId: string,
  feedback: {
    recipientReaction?: string;
    deskTestStatus?: string;
    feedbackNotes?: string;
    linkedinPosted?: boolean;
    deliveryStatus?: string;
  },
): Promise<void> {
  const supabase = await createClient();
  const payload: Record<string, unknown> = {};
  if (feedback.recipientReaction !== undefined)
    payload.recipient_reaction = feedback.recipientReaction;
  if (feedback.deskTestStatus !== undefined) {
    payload.desk_test_status = feedback.deskTestStatus;
    payload.desk_test_checked_date = new Date().toISOString().slice(0, 10);
  }
  if (feedback.feedbackNotes !== undefined)
    payload.feedback_notes = feedback.feedbackNotes;
  if (feedback.linkedinPosted !== undefined)
    payload.linkedin_posted = feedback.linkedinPosted;
  if (feedback.deliveryStatus !== undefined)
    payload.delivery_status = feedback.deliveryStatus;

  const { data, error } = await supabase
    .from("gift_records")
    .update(payload)
    .eq("id", giftId)
    .select("company_id, employee_id")
    .single();
  if (error) throw new Error(error.message);
  if (data) await recalcPreferences(data.company_id as string, data.employee_id as string);
}

// ---------- Duplicate detection ----------------------------------------------

export async function checkDuplicates(
  employeeId: string,
  productSku: string,
): Promise<{
  isDuplicate: boolean;
  previousGift?: GiftRecord;
  daysSinceLast?: number;
  recommendation: string;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gift_records")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("product_sku", productSku)
    .eq("is_archived", false)
    .order("gifted_date", { ascending: false })
    .limit(1);

  const previous = (data ?? [])[0] as GiftRecord | undefined;
  if (!previous) {
    return { isDuplicate: false, recommendation: "No prior record - safe to gift." };
  }
  const days = Math.round(
    (Date.now() - new Date(previous.gifted_date).getTime()) / 86_400_000,
  );
  const months = Math.max(1, Math.round(days / 30));
  return {
    isDuplicate: true,
    previousGift: previous,
    daysSinceLast: days,
    recommendation: `This employee received ${previous.product_name} (${productSku}) about ${months} month${months === 1 ? "" : "s"} ago. Consider a different product to keep gifts fresh.`,
  };
}

export async function getProductsToAvoid(
  employeeId: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data: gifts } = await supabase
    .from("gift_records")
    .select("product_sku")
    .eq("employee_id", employeeId)
    .eq("is_archived", false);
  const gifted = (gifts ?? []).map((g) => g.product_sku as string);

  const { data: prefs } = await supabase
    .from("employee_preferences")
    .select("avoided_products")
    .eq("employee_id", employeeId)
    .maybeSingle();
  const avoided = (prefs?.avoided_products as string[] | null) ?? [];

  return [...new Set([...gifted, ...avoided])];
}

// ---------- Preferences ------------------------------------------------------

export async function getEmployeePreferences(
  employeeId: string,
): Promise<EmployeePreferences | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employee_preferences")
    .select("*")
    .eq("employee_id", employeeId)
    .maybeSingle();
  return (data as EmployeePreferences | null) ?? null;
}

export async function updateEmployeeArchetype(
  companyId: string,
  employeeId: string,
  fields: { archetype?: string; giftPersonality?: string; dietaryNotes?: string },
): Promise<void> {
  const supabase = await createClient();
  const payload: Record<string, unknown> = {
    employee_id: employeeId,
    company_id: companyId,
  };
  if (fields.archetype !== undefined) payload.archetype = fields.archetype;
  if (fields.giftPersonality !== undefined)
    payload.gift_personality = fields.giftPersonality;
  if (fields.dietaryNotes !== undefined)
    payload.dietary_notes = fields.dietaryNotes;
  const { error } = await supabase
    .from("employee_preferences")
    .upsert(payload, { onConflict: "employee_id" });
  if (error) throw new Error(error.message);
}

/** Recomputes aggregate preference scores from the employee's gift records. */
export async function recalcPreferences(
  companyId: string,
  employeeId: string,
): Promise<void> {
  const supabase = await createClient();
  const { data: gifts } = await supabase
    .from("gift_records")
    .select("collection_code, gifted_date, desk_test_status, recipient_reaction")
    .eq("employee_id", employeeId)
    .eq("is_archived", false);

  const records = gifts ?? [];
  const total = records.length;
  const onDesk = records.filter((r) => r.desk_test_status === "on_desk").length;
  const checked = records.filter(
    (r) => r.desk_test_status && r.desk_test_status !== "unknown",
  ).length;
  const deskScore = checked > 0 ? Math.round((onDesk / checked) * 100) : 0;

  const reactionScores = records
    .map((r) => REACTION_SCORE[(r.recipient_reaction as string) ?? "unknown"] ?? 0)
    .filter((s) => s > 0);
  const avgReaction =
    reactionScores.length > 0
      ? Number(
          (
            reactionScores.reduce((a, b) => a + b, 0) / reactionScores.length
          ).toFixed(2),
        )
      : null;

  const collections = [
    ...new Set(
      records.map((r) => r.collection_code as string | null).filter(Boolean),
    ),
  ] as string[];

  const dates = records
    .map((r) => r.gifted_date as string)
    .sort((a, b) => b.localeCompare(a));
  const lastGifted = dates[0] ?? null;

  await supabase.from("employee_preferences").upsert(
    {
      employee_id: employeeId,
      company_id: companyId,
      total_gifts_received: total,
      total_gifts_on_desk: onDesk,
      desk_test_score: deskScore,
      avg_reaction_score: avgReaction,
      preferred_collections: collections,
      last_gifted_date: lastGifted,
    },
    { onConflict: "employee_id" },
  );
}

export async function calculateDeskTestScore(
  employeeId: string,
): Promise<number> {
  const prefs = await getEmployeePreferences(employeeId);
  return prefs?.desk_test_score ?? 0;
}

// ---------- Statistics -------------------------------------------------------

export async function getCompanyGiftStats(companyId: string): Promise<{
  totalGiftsSent: number;
  totalEmployeesGifted: number;
  avgGiftsPerEmployee: number;
  topProducts: Array<{ sku: string; name: string; count: number }>;
  topOccasions: Array<{ type: string; count: number }>;
  overallDeskTestScore: number;
  overallReactionScore: number;
  giftsByMonth: Array<{ month: string; count: number }>;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gift_records")
    .select(
      "employee_id, product_sku, product_name, occasion_type, desk_test_status, recipient_reaction, gifted_date",
    )
    .eq("company_id", companyId)
    .eq("is_archived", false);

  const records = data ?? [];
  const total = records.length;
  const employees = new Set(records.map((r) => r.employee_id as string));

  const productCounts = new Map<string, { name: string; count: number }>();
  const occasionCounts = new Map<string, number>();
  let onDesk = 0;
  let checked = 0;
  const reactionScores: number[] = [];
  const monthMap = new Map<string, number>();

  for (const r of records) {
    const sku = r.product_sku as string;
    const existing = productCounts.get(sku);
    productCounts.set(sku, {
      name: r.product_name as string,
      count: (existing?.count ?? 0) + 1,
    });
    const occ = r.occasion_type as string;
    occasionCounts.set(occ, (occasionCounts.get(occ) ?? 0) + 1);
    if (r.desk_test_status === "on_desk") onDesk += 1;
    if (r.desk_test_status && r.desk_test_status !== "unknown") checked += 1;
    const score = REACTION_SCORE[(r.recipient_reaction as string) ?? "unknown"] ?? 0;
    if (score > 0) reactionScores.push(score);
    const month = (r.gifted_date as string).slice(0, 7);
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
  }

  // Last 12 months series.
  const giftsByMonth: Array<{ month: string; count: number }> = [];
  const now = new Date();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    giftsByMonth.push({ month: key, count: monthMap.get(key) ?? 0 });
  }

  return {
    totalGiftsSent: total,
    totalEmployeesGifted: employees.size,
    avgGiftsPerEmployee:
      employees.size > 0 ? Number((total / employees.size).toFixed(1)) : 0,
    topProducts: [...productCounts.entries()]
      .map(([sku, v]) => ({ sku, name: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topOccasions: [...occasionCounts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    overallDeskTestScore: checked > 0 ? Math.round((onDesk / checked) * 100) : 0,
    overallReactionScore:
      reactionScores.length > 0
        ? Number(
            (
              reactionScores.reduce((a, b) => a + b, 0) / reactionScores.length
            ).toFixed(1),
          )
        : 0,
    giftsByMonth,
  };
}

export async function getEmployeeGiftStats(employeeId: string): Promise<{
  totalGifts: number;
  giftTimeline: GiftRecord[];
  deskTestScore: number;
  avgReaction: number;
  collectionsReceived: string[];
  lastGiftedDate: string | null;
  daysSinceLastGift: number | null;
}> {
  const timeline = await getEmployeeGiftHistory(employeeId);
  const prefs = await getEmployeePreferences(employeeId);
  const last = timeline[0]?.gifted_date ?? null;
  return {
    totalGifts: timeline.length,
    giftTimeline: timeline,
    deskTestScore: prefs?.desk_test_score ?? 0,
    avgReaction: prefs?.avg_reaction_score ?? 0,
    collectionsReceived: prefs?.preferred_collections ?? [],
    lastGiftedDate: last,
    daysSinceLastGift: last
      ? Math.round((Date.now() - new Date(last).getTime()) / 86_400_000)
      : null,
  };
}
