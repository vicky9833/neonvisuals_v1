/**
 * Lead Engine — INTERNAL USE ONLY (admin / super_admin, server-side).
 *
 * Self-contained CRM: every enquiry is a lead, leads carry an activity log and
 * status history, and converting a won lead creates a company (client) record.
 * No external CRM integration. All business logic lives here.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import type { Company } from "@/lib/auth-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal_sent"
  | "negotiation"
  | "won"
  | "lost"
  | "dormant";

export type LeadPriority = "hot" | "warm" | "medium" | "cold";

export type LeadSource =
  | "whatsapp"
  | "website"
  | "gift_builder"
  | "linkedin"
  | "referral"
  | "event"
  | "cold_outreach"
  | "google"
  | "instagram"
  | "other";

export type ActivityType =
  | "note"
  | "call"
  | "whatsapp"
  | "email"
  | "meeting"
  | "proposal"
  | "follow_up"
  | "sample_sent"
  | "status_change"
  | "quote_created"
  | "order_placed"
  | "other";

export type ActivityOutcome =
  | "positive"
  | "neutral"
  | "negative"
  | "no_answer"
  | "rescheduled";

export interface LeadInput {
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  contactDesignation?: string;
  companyName: string;
  companyIndustry?: string;
  companySize?: string;
  companyCity?: string;
  companyWebsite?: string;
  status?: LeadStatus;
  priority?: LeadPriority;
  source?: LeadSource;
  sourceDetail?: string;
  estimatedOrderValue?: number;
  estimatedKitCount?: number;
  interestedCollections?: string[];
  interestedOccasions?: string[];
  assignedTo?: string;
  nextFollowUpDate?: string;
  nextFollowUpNote?: string;
  tags?: string[];
  notes?: string;
}

export interface ActivityInput {
  activityType: ActivityType;
  title: string;
  description?: string;
  outcome?: ActivityOutcome;
  quoteId?: string;
  followUpDate?: string;
  followUpNote?: string;
}

export interface CompanyInput {
  name?: string;
  industry?: string;
  employeeCount?: string;
  city?: string;
  website?: string;
}

export interface Lead {
  id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_designation: string | null;
  company_name: string;
  company_industry: string | null;
  company_size: string | null;
  company_city: string | null;
  company_website: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  source: LeadSource;
  source_detail: string | null;
  estimated_order_value: number | null;
  estimated_kit_count: number | null;
  interested_collections: string[] | null;
  interested_occasions: string[] | null;
  company_id: string | null;
  first_quote_id: string | null;
  first_order_id: string | null;
  converted_date: string | null;
  assigned_to: string | null;
  next_follow_up_date: string | null;
  next_follow_up_note: string | null;
  last_contacted_date: string | null;
  lead_score: number;
  loss_reason: string | null;
  loss_notes: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  activities?: LeadActivity[];
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: ActivityType;
  title: string;
  description: string | null;
  outcome: ActivityOutcome | null;
  quote_id: string | null;
  performed_by: string | null;
  performed_at: string;
  follow_up_date: string | null;
  follow_up_note: string | null;
  created_at: string;
}

export interface LeadStatusEntry {
  id: string;
  lead_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Pipeline definition
// ---------------------------------------------------------------------------

export const PIPELINE_STAGES: { status: LeadStatus; label: string }[] = [
  { status: "new", label: "New" },
  { status: "contacted", label: "Contacted" },
  { status: "qualified", label: "Qualified" },
  { status: "proposal_sent", label: "Proposal" },
  { status: "negotiation", label: "Negotiation" },
  { status: "won", label: "Won" },
  { status: "lost", label: "Lost" },
];

/** Statuses still "in play" — used for pipeline value + overdue follow-ups. */
export const ACTIVE_LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
];

export const LOSS_REASONS = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "chose_competitor", label: "Chose competitor" },
  { value: "no_budget", label: "No budget" },
  { value: "no_response", label: "No response" },
  { value: "timing", label: "Bad timing" },
  { value: "other", label: "Other" },
] as const;

// ---------------------------------------------------------------------------
// Row mapping + payload building
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapLead(row: any): Lead {
  return {
    id: row.id,
    contact_name: row.contact_name,
    contact_email: row.contact_email ?? null,
    contact_phone: row.contact_phone ?? null,
    contact_designation: row.contact_designation ?? null,
    company_name: row.company_name,
    company_industry: row.company_industry ?? null,
    company_size: row.company_size ?? null,
    company_city: row.company_city ?? null,
    company_website: row.company_website ?? null,
    status: row.status as LeadStatus,
    priority: (row.priority ?? "medium") as LeadPriority,
    source: (row.source ?? "website") as LeadSource,
    source_detail: row.source_detail ?? null,
    estimated_order_value: row.estimated_order_value ?? null,
    estimated_kit_count: row.estimated_kit_count ?? null,
    interested_collections: row.interested_collections ?? null,
    interested_occasions: row.interested_occasions ?? null,
    company_id: row.company_id ?? null,
    first_quote_id: row.first_quote_id ?? null,
    first_order_id: row.first_order_id ?? null,
    converted_date: row.converted_date ?? null,
    assigned_to: row.assigned_to ?? null,
    next_follow_up_date: row.next_follow_up_date ?? null,
    next_follow_up_note: row.next_follow_up_note ?? null,
    last_contacted_date: row.last_contacted_date ?? null,
    lead_score: Number(row.lead_score ?? 0),
    loss_reason: row.loss_reason ?? null,
    loss_notes: row.loss_notes ?? null,
    notes: row.notes ?? null,
    tags: row.tags ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    activities: row.lead_activities
      ? (row.lead_activities as any[]).map(mapActivity)
      : undefined,
  };
}

function mapActivity(row: any): LeadActivity {
  return {
    id: row.id,
    lead_id: row.lead_id,
    activity_type: row.activity_type as ActivityType,
    title: row.title,
    description: row.description ?? null,
    outcome: (row.outcome ?? null) as ActivityOutcome | null,
    quote_id: row.quote_id ?? null,
    performed_by: row.performed_by ?? null,
    performed_at: row.performed_at,
    follow_up_date: row.follow_up_date ?? null,
    follow_up_note: row.follow_up_note ?? null,
    created_at: row.created_at,
  };
}

function mapStatusEntry(row: any): LeadStatusEntry {
  return {
    id: row.id,
    lead_id: row.lead_id,
    from_status: row.from_status ?? null,
    to_status: row.to_status,
    changed_by: row.changed_by ?? null,
    notes: row.notes ?? null,
    created_at: row.created_at,
  };
}

function buildLeadPayload(input: Partial<LeadInput>): Record<string, unknown> {
  const map: Record<string, string> = {
    contactName: "contact_name",
    contactEmail: "contact_email",
    contactPhone: "contact_phone",
    contactDesignation: "contact_designation",
    companyName: "company_name",
    companyIndustry: "company_industry",
    companySize: "company_size",
    companyCity: "company_city",
    companyWebsite: "company_website",
    status: "status",
    priority: "priority",
    source: "source",
    sourceDetail: "source_detail",
    estimatedOrderValue: "estimated_order_value",
    estimatedKitCount: "estimated_kit_count",
    interestedCollections: "interested_collections",
    interestedOccasions: "interested_occasions",
    assignedTo: "assigned_to",
    nextFollowUpDate: "next_follow_up_date",
    nextFollowUpNote: "next_follow_up_note",
    tags: "tags",
    notes: "notes",
  };
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const col = map[key];
    if (col && value !== undefined) payload[col] = value === "" ? null : value;
  }
  return payload;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const LEAD_SELECT = "*";

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createLead(input: LeadInput): Promise<Lead> {
  const supa = createAdminClient();
  const { data, error } = await supa
    .from("leads")
    .insert(buildLeadPayload(input))
    .select(LEAD_SELECT)
    .single();
  if (error) throw new Error(`Create lead failed: ${error.message}`);
  const lead = mapLead(data);
  // Initial score + status history.
  await supa.from("lead_status_history").insert({
    lead_id: lead.id,
    from_status: null,
    to_status: lead.status,
    notes: "Lead created",
  });
  await calculateLeadScore(lead.id);
  return (await getLead(lead.id)) ?? lead;
}

export async function updateLead(
  id: string,
  updates: Partial<LeadInput>,
): Promise<Lead> {
  const supa = createAdminClient();
  const payload = buildLeadPayload(updates);
  if (Object.keys(payload).length > 0) {
    const { error } = await supa.from("leads").update(payload).eq("id", id);
    if (error) throw new Error(`Update lead failed: ${error.message}`);
  }
  await calculateLeadScore(id);
  const lead = await getLead(id);
  if (!lead) throw new Error("Lead not found");
  return lead;
}

export async function getLead(id: string): Promise<Lead | null> {
  const supa = createAdminClient();
  const { data, error } = await supa
    .from("leads")
    .select("*, lead_activities(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Get lead failed: ${error.message}`);
  if (!data) return null;
  const lead = mapLead(data);
  if (lead.activities) {
    lead.activities.sort((a, b) =>
      b.performed_at.localeCompare(a.performed_at),
    );
  }
  return lead;
}

export interface ListLeadsOptions {
  status?: LeadStatus | LeadStatus[];
  priority?: LeadPriority;
  source?: LeadSource;
  assignedTo?: string;
  search?: string;
  tags?: string[];
  hasFollowUpBefore?: string;
  sortBy?:
    | "created_at"
    | "lead_score"
    | "next_follow_up_date"
    | "estimated_order_value"
    | "last_contacted_date";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function listLeads(
  options: ListLeadsOptions = {},
): Promise<{ leads: Lead[]; total: number }> {
  const {
    sortBy = "created_at",
    sortOrder = "desc",
    page = 1,
    pageSize = 100,
  } = options;
  const supa = createAdminClient();
  let query = supa.from("leads").select(LEAD_SELECT, { count: "exact" });

  if (options.status) {
    if (Array.isArray(options.status)) query = query.in("status", options.status);
    else query = query.eq("status", options.status);
  }
  if (options.priority) query = query.eq("priority", options.priority);
  if (options.source) query = query.eq("source", options.source);
  if (options.assignedTo) query = query.eq("assigned_to", options.assignedTo);
  if (options.tags && options.tags.length > 0)
    query = query.overlaps("tags", options.tags);
  if (options.hasFollowUpBefore)
    query = query.lte("next_follow_up_date", options.hasFollowUpBefore);
  if (options.search) {
    const term = options.search.replace(/[%,]/g, " ").trim();
    query = query.or(
      `contact_name.ilike.%${term}%,contact_email.ilike.%${term}%,company_name.ilike.%${term}%`,
    );
  }

  query = query.order(sortBy, {
    ascending: sortOrder === "asc",
    nullsFirst: false,
  });
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(`List leads failed: ${error.message}`);
  return { leads: (data ?? []).map(mapLead), total: count ?? 0 };
}

// ---------------------------------------------------------------------------
// Status management
// ---------------------------------------------------------------------------

export async function updateLeadStatus(
  id: string,
  newStatus: LeadStatus,
  notes?: string,
  changedBy?: string,
  lossReason?: string,
): Promise<void> {
  const supa = createAdminClient();
  const { data: current, error: readErr } = await supa
    .from("leads")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (readErr) throw new Error(`Update status failed: ${readErr.message}`);
  if (!current) throw new Error("Lead not found");

  if (newStatus === "lost" && !lossReason) {
    throw new Error("A loss reason is required when marking a lead as lost.");
  }

  const from = current.status as LeadStatus;
  const patch: Record<string, unknown> = { status: newStatus };
  if (newStatus === "lost") {
    patch.loss_reason = lossReason;
    patch.loss_notes = notes ?? null;
  }

  const { error: updErr } = await supa.from("leads").update(patch).eq("id", id);
  if (updErr) throw new Error(`Update status failed: ${updErr.message}`);

  await supa.from("lead_status_history").insert({
    lead_id: id,
    from_status: from,
    to_status: newStatus,
    changed_by: changedBy ?? null,
    notes: notes ?? null,
  });
  await supa.from("lead_activities").insert({
    lead_id: id,
    activity_type: "status_change",
    title: `Status changed to ${newStatus.replace("_", " ")}`,
    description: notes ?? null,
    performed_by: changedBy ?? null,
  });

  await calculateLeadScore(id);
}

export async function getLeadStatusHistory(
  leadId: string,
): Promise<LeadStatusEntry[]> {
  const supa = createAdminClient();
  const { data, error } = await supa
    .from("lead_status_history")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Status history failed: ${error.message}`);
  return (data ?? []).map(mapStatusEntry);
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

export async function addActivity(
  leadId: string,
  activity: ActivityInput,
  performedBy?: string,
): Promise<LeadActivity> {
  const supa = createAdminClient();
  const { data, error } = await supa
    .from("lead_activities")
    .insert({
      lead_id: leadId,
      activity_type: activity.activityType,
      title: activity.title,
      description: activity.description ?? null,
      outcome: activity.outcome ?? null,
      quote_id: activity.quoteId ?? null,
      performed_by: performedBy ?? null,
      follow_up_date: activity.followUpDate ?? null,
      follow_up_note: activity.followUpNote ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Add activity failed: ${error.message}`);

  // Logging an activity counts as contact; sync follow-up onto the lead.
  const leadPatch: Record<string, unknown> = {
    last_contacted_date: new Date().toISOString(),
  };
  if (activity.followUpDate) {
    leadPatch.next_follow_up_date = activity.followUpDate;
    leadPatch.next_follow_up_note = activity.followUpNote ?? null;
  }
  await supa.from("leads").update(leadPatch).eq("id", leadId);
  await calculateLeadScore(leadId);

  return mapActivity(data);
}

export async function getActivities(leadId: string): Promise<LeadActivity[]> {
  const supa = createAdminClient();
  const { data, error } = await supa
    .from("lead_activities")
    .select("*")
    .eq("lead_id", leadId)
    .order("performed_at", { ascending: false });
  if (error) throw new Error(`Get activities failed: ${error.message}`);
  return (data ?? []).map(mapActivity);
}

// ---------------------------------------------------------------------------
// Lead scoring
// ---------------------------------------------------------------------------

const LARGE_SIZES = new Set(["200-500", "500-1000", "1000+", "200–500", "500–1,000", "1,000+"]);

export async function calculateLeadScore(leadId: string): Promise<number> {
  const supa = createAdminClient();
  const { data: lead } = await supa
    .from("leads")
    .select(
      "status, source, company_size, company_city, company_website, estimated_order_value, interested_collections, last_contacted_date, created_at",
    )
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return 0;

  const { data: activities } = await supa
    .from("lead_activities")
    .select("activity_type")
    .eq("lead_id", leadId);

  let score = 0;
  if (lead.company_size && LARGE_SIZES.has(lead.company_size as string)) score += 20;
  if (lead.source === "referral") score += 15;
  if (Number(lead.estimated_order_value ?? 0) > 200000) score += 15;
  if (((lead.interested_collections as string[] | null) ?? []).length >= 3)
    score += 10;
  if (lead.status && lead.status !== "new") score += 10;
  if ((activities ?? []).some((a) => a.activity_type === "meeting")) score += 10;
  if (lead.company_website) score += 5;
  if (
    typeof lead.company_city === "string" &&
    lead.company_city.toLowerCase() === "bangalore"
  )
    score += 5;

  // Recency penalty.
  const reference = (lead.last_contacted_date ?? lead.created_at) as
    | string
    | null;
  if (reference) {
    const days =
      (Date.now() - new Date(reference).getTime()) / 86_400_000;
    if (days >= 14) score -= 10;
  }
  if (lead.status === "dormant") score -= 20;

  score = Math.max(0, Math.min(100, score));
  await supa.from("leads").update({ lead_score: score }).eq("id", leadId);
  return score;
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function convertLeadToClient(
  leadId: string,
  companyData?: Partial<CompanyInput>,
  changedBy?: string,
): Promise<{ lead: Lead; company: Company }> {
  const supa = createAdminClient();
  const existing = await getLead(leadId);
  if (!existing) throw new Error("Lead not found");

  if (existing.company_id) {
    const { data: linked } = await supa
      .from("companies")
      .select("*")
      .eq("id", existing.company_id)
      .single();
    return { lead: existing, company: linked as Company };
  }

  const name = companyData?.name ?? existing.company_name;
  const { data: company, error } = await supa
    .from("companies")
    .insert({
      name,
      slug: slugify(name),
      industry: companyData?.industry ?? existing.company_industry ?? null,
      employee_count: companyData?.employeeCount ?? existing.company_size ?? null,
      city: companyData?.city ?? existing.company_city ?? "Bangalore",
      website: companyData?.website ?? existing.company_website ?? null,
      onboarding_completed: false,
      primary_contact_name: existing.contact_name,
      primary_contact_email: existing.contact_email,
      primary_contact_phone: existing.contact_phone,
      created_by: changedBy ?? null,
    })
    .select("*")
    .single();
  if (error || !company)
    throw new Error(`Convert failed: ${error?.message ?? "no company"}`);

  await supa
    .from("leads")
    .update({
      company_id: company.id,
      status: "won",
      converted_date: new Date().toISOString(),
    })
    .eq("id", leadId);

  await supa.from("lead_status_history").insert({
    lead_id: leadId,
    from_status: existing.status,
    to_status: "won",
    changed_by: changedBy ?? null,
    notes: `Converted to client: ${company.name}`,
  });
  await supa.from("lead_activities").insert({
    lead_id: leadId,
    activity_type: "status_change",
    title: "Converted to client",
    description: `Company "${company.name}" created from this lead.`,
    performed_by: changedBy ?? null,
  });

  const lead = await getLead(leadId);
  return { lead: lead!, company: company as Company };
}

// ---------------------------------------------------------------------------
// Stats + pipeline
// ---------------------------------------------------------------------------

export interface LeadStats {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  byPriority: Record<string, number>;
  pipelineValue: number;
  conversionRate: number;
  avgDaysToConvert: number;
  overdueFollowUps: number;
  thisWeekFollowUps: number;
}

export async function getLeadStats(): Promise<LeadStats> {
  const supa = createAdminClient();
  const { data, error } = await supa
    .from("leads")
    .select(
      "status, source, priority, estimated_order_value, next_follow_up_date, created_at, converted_date",
    );
  if (error) throw new Error(`Lead stats failed: ${error.message}`);
  const rows = data ?? [];

  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  let pipelineValue = 0;
  let won = 0;
  let lost = 0;
  let convertSum = 0;
  let convertCount = 0;
  let overdueFollowUps = 0;
  let thisWeekFollowUps = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAhead = new Date(today);
  weekAhead.setDate(weekAhead.getDate() + 7);

  for (const r of rows) {
    const status = (r.status as string) ?? "new";
    byStatus[status] = (byStatus[status] ?? 0) + 1;
    bySource[r.source as string] = (bySource[r.source as string] ?? 0) + 1;
    byPriority[r.priority as string] =
      (byPriority[r.priority as string] ?? 0) + 1;

    if (ACTIVE_LEAD_STATUSES.includes(status as LeadStatus)) {
      pipelineValue += Number(r.estimated_order_value ?? 0);
    }
    if (status === "won") {
      won += 1;
      if (r.converted_date && r.created_at) {
        const days =
          (new Date(r.converted_date as string).getTime() -
            new Date(r.created_at as string).getTime()) /
          86_400_000;
        if (days >= 0) {
          convertSum += days;
          convertCount += 1;
        }
      }
    }
    if (status === "lost") lost += 1;

    if (r.next_follow_up_date && status !== "won" && status !== "lost") {
      const f = new Date(r.next_follow_up_date as string);
      f.setHours(0, 0, 0, 0);
      if (f < today) overdueFollowUps += 1;
      else if (f <= weekAhead) thisWeekFollowUps += 1;
    }
  }

  return {
    total: rows.length,
    byStatus,
    bySource,
    byPriority,
    pipelineValue,
    conversionRate: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0,
    avgDaysToConvert: convertCount > 0 ? Math.round(convertSum / convertCount) : 0,
    overdueFollowUps,
    thisWeekFollowUps,
  };
}

export interface PipelineStage {
  status: LeadStatus;
  label: string;
  leads: Lead[];
  count: number;
  value: number;
}

export async function getPipelineData(): Promise<{ stages: PipelineStage[] }> {
  const { leads } = await listLeads({ pageSize: 500, sortBy: "lead_score" });
  const stages: PipelineStage[] = PIPELINE_STAGES.map((stage) => {
    const stageLeads = leads.filter((l) => l.status === stage.status);
    return {
      status: stage.status,
      label: stage.label,
      leads: stageLeads,
      count: stageLeads.length,
      value: stageLeads.reduce(
        (sum, l) => sum + Number(l.estimated_order_value ?? 0),
        0,
      ),
    };
  });
  return { stages };
}

// ---------------------------------------------------------------------------
// Capture (gift builder / public enquiries) — dedupes by email
// ---------------------------------------------------------------------------

export interface CaptureInput {
  name: string;
  email?: string;
  phone?: string;
  company: string;
  occasion?: string;
  source?: LeadSource;
  kitSummary?: string;
}

export async function captureLead(
  input: CaptureInput,
): Promise<{ created: boolean }> {
  const supa = createAdminClient();

  // Dedupe by email when provided.
  if (input.email) {
    const { data: existing } = await supa
      .from("leads")
      .select("id")
      .ilike("contact_email", input.email)
      .maybeSingle();
    if (existing) {
      await supa.from("lead_activities").insert({
        lead_id: existing.id,
        activity_type: "whatsapp",
        title: "New gift builder enquiry",
        description: input.kitSummary ?? null,
      });
      await supa
        .from("leads")
        .update({ last_contacted_date: new Date().toISOString() })
        .eq("id", existing.id);
      return { created: false };
    }
  }

  const lead = await createLead({
    contactName: input.name,
    contactEmail: input.email,
    contactPhone: input.phone,
    companyName: input.company,
    source: input.source ?? "gift_builder",
    interestedOccasions: input.occasion ? [input.occasion] : undefined,
    priority: "warm",
  });

  await supa.from("lead_activities").insert({
    lead_id: lead.id,
    activity_type: "whatsapp",
    title: "Gift builder submission",
    description: input.kitSummary ?? null,
  });

  return { created: true };
}

/** Count of leads created since midnight today (admin overview quick-view). */
export async function getNewLeadsToday(): Promise<number> {
  const supa = createAdminClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { count } = await supa
    .from("leads")
    .select("id", { count: "exact", head: true })
    .gte("created_at", start.toISOString());
  return count ?? 0;
}
