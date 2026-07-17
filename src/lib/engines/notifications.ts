import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendNotificationEmail, wasEmailSentRecently } from "@/lib/services/email";
import { buildOpsWaLink } from "@/lib/utils/wa";

/**
 * Notification engine (Prompt 6a). Writes the in-app substrate (`notifications`)
 * and — per each recipient's `notification_prefs` — fires email through the
 * existing Resend path. Audiences are ALWAYS role queries (§7), never hardcoded
 * addresses, resolved from company_members / departments.manager_id /
 * platform_staff (recon R3).
 *
 * PII SAFETY (§10.13): notification TITLES and email SUBJECTS must be
 * reference-style — NEVER an employee name/dob/phone. In-app BODIES may name the
 * person ONLY for the tenant audience (hr/org_admin/manager) who are authorised
 * to see employee PII; PLATFORM bodies stay reference-style (no employee PII).
 * Callers are responsible for honouring this; item 5 adversarially verifies it.
 *
 * The engine writes `notifications` with an ELEVATED (service-role) client
 * because RLS grants INSERT to service-role only — but it is SCOPED to the
 * resolved recipients (one row per recipient_user_id) and never writes outside
 * the resolved audience. Reads/marks of a user's own notifications go through
 * the user's RLS-scoped client (see the /api/notifications routes).
 */

// ── Notification type keys (also used as notification_prefs.type) ────────────
export const NOTIFICATION_TYPES = {
  OCCASION_REMINDER: "occasion_reminder", // tenant: an occasion is at its lead date
  OCCASION_OPS: "occasion_ops", // platform: ops visibility of an upcoming occasion
  OCCASION_ESCALATION: "occasion_escalation", // tenant: §7 escalation (no gift chosen)
  OCCASION_ESCALATION_OPS: "occasion_escalation_ops", // platform: §7 escalation
  PLATFORM_DIGEST: "platform_digest", // platform: daily aggregate across orgs
  QUOTE_REQUEST_OPS: "quote_request_ops", // platform: a tenant requested a quote (§9)
  QUOTE_APPROVAL_ROUTED: "quote_approval_routed", // tenant: an over-limit quote routed to the next approver (§7, 7b)
  ORDER_IN_PRODUCTION: "order_in_production", // tenant: order entered production (§7, 7c-i) — hr, in-app
  ORDER_PROOF_PHOTOS_READY: "order_proof_photos_ready", // tenant: QC proof photos ready (§7, 7c-i seam; fired by 7c-ii) — hr/org_admin, email
  ORDER_DISPATCHED: "order_dispatched", // tenant: order shipped/dispatched (§7, 7c-i) — hr + dept manager, email + tracking
  ORDER_DELIVERED: "order_delivered", // tenant: order delivered (§7, 7c-i) — hr, in-app
  MEMBER_INVITED: "member_invited",
  MEMBER_JOINED: "member_joined",
  MEMBER_REMOVED: "member_removed",
  MEMBER_ROLE_CHANGED: "member_role_changed",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

// ── Stable occasion identity (survives occasion regeneration) ────────────────
export interface StableOccasion {
  company_id: string;
  employee_id: string | null;
  occasion_type_key: string;
  date: string;
  title?: string | null;
}
/**
 * Stable key for an occasion INSTANCE, independent of the ephemeral occasions.id
 * (regenerated each cron run). Employee occasions are unique by
 * (company, employee, type, date). Company-WIDE festival/custom occasions can
 * share a date, so the title (festival/custom name — NOT employee PII) is
 * appended to disambiguate. Used for the gift-state key, notification dedupe,
 * and per-stage escalation dedupe — one source of truth.
 */
export function stableOccasionKey(o: StableOccasion): string {
  return o.employee_id
    ? `${o.company_id}:${o.employee_id}:${o.occasion_type_key}:${o.date}`
    : `${o.company_id}:cw:${o.occasion_type_key}:${o.date}:${o.title ?? ""}`;
}

// ── Audience specs (§7 role queries) ─────────────────────────────────────────
export type TenantRole = "hr" | "org_admin" | "org_owner" | "dept_manager";
export type PlatformAudience =
  | "platform_admin" // platform_staff role IN {owner, admin}
  | "platform_ops" // role = ops
  | "platform_owner" // role = owner
  | "platform_finance"; // role = finance

export type AudienceSpec =
  | { plane: "tenant"; role: TenantRole }
  | { plane: "platform"; role: PlatformAudience };

export interface AudienceCtx {
  companyId?: string | null;
  departmentId?: string | null;
}

const PLATFORM_ROLE_MAP: Record<PlatformAudience, string[]> = {
  platform_admin: ["owner", "admin"],
  platform_ops: ["ops"],
  platform_owner: ["owner"],
  platform_finance: ["finance"],
};

/**
 * Resolve a single audience spec to a set of user_ids. Tenant specs are ALWAYS
 * constrained to ctx.companyId (tenant isolation — never crosses companies).
 */
export async function resolveAudienceSpec(
  client: SupabaseClient,
  spec: AudienceSpec,
  ctx: AudienceCtx,
): Promise<string[]> {
  if (spec.plane === "platform") {
    const roles = PLATFORM_ROLE_MAP[spec.role];
    const { data } = await client
      .from("platform_staff")
      .select("user_id")
      .in("role", roles);
    return (data ?? []).map((r) => r.user_id as string);
  }

  // tenant plane — REQUIRES a companyId (isolation).
  const companyId = ctx.companyId;
  if (!companyId) return [];

  if (spec.role === "dept_manager") {
    if (!ctx.departmentId) return [];
    const ids = new Set<string>();
    // departments.manager_id (constrained to the company — isolation).
    const { data: dept } = await client
      .from("departments")
      .select("manager_id, company_id")
      .eq("id", ctx.departmentId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (dept?.manager_id) ids.add(dept.manager_id as string);
    // company_members role=manager assigned to that department.
    const { data: mgrs } = await client
      .from("company_members")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("role", "manager")
      .eq("department_id", ctx.departmentId)
      .eq("status", "active");
    for (const m of mgrs ?? []) ids.add(m.user_id as string);
    return [...ids];
  }

  const { data } = await client
    .from("company_members")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("role", spec.role)
    .eq("status", "active");
  return (data ?? []).map((r) => r.user_id as string);
}

/** Resolve a UNION of audience specs to a deduped user_id set. */
export async function resolveAudience(
  client: SupabaseClient,
  specs: AudienceSpec[],
  ctx: AudienceCtx,
): Promise<string[]> {
  const all = new Set<string>();
  for (const spec of specs) {
    const ids = await resolveAudienceSpec(client, spec, ctx);
    for (const id of ids) all.add(id);
  }
  return [...all];
}

// ── Prefs ────────────────────────────────────────────────────────────────────
interface Pref {
  in_app: boolean;
  email: boolean;
  digest_frequency: string; // immediate | daily | weekly | off
}
const DEFAULT_PREF: Pref = { in_app: true, email: true, digest_frequency: "immediate" };

async function prefsFor(
  client: SupabaseClient,
  userIds: string[],
  type: string,
): Promise<Map<string, Pref>> {
  const map = new Map<string, Pref>();
  if (userIds.length === 0) return map;
  const { data } = await client
    .from("notification_prefs")
    .select("user_id, in_app, email, digest_frequency")
    .in("user_id", userIds)
    .eq("type", type);
  for (const r of data ?? []) {
    map.set(r.user_id as string, {
      in_app: r.in_app as boolean,
      email: r.email as boolean,
      digest_frequency: (r.digest_frequency as string) ?? "immediate",
    });
  }
  return map;
}

// ── notify() ──────────────────────────────────────────────────────────────────
export interface NotifyEmail {
  /** Reference-style subject — NO employee name/dob/phone (§10.13). */
  subject: string;
  html: string;
  template: string;
  /** Dedupe window (hours) via email_log; default 20 (matches the cron). */
  dedupeHours?: number;
}

export interface NotifyInput {
  type: NotificationType;
  /** Role-audience specs (§7). Optional when `recipients` is given explicitly. */
  audience?: AudienceSpec[];
  /** Explicit recipient user_ids, unioned with the resolved role audience. */
  recipients?: string[];
  companyId?: string | null; // stamped on notifications.company_id + tenant resolution
  departmentId?: string | null;
  /** Reference-style title — NO employee name/dob/phone (§10.13). */
  title: string;
  /** In-app body; MAY name the person for the tenant audience only. */
  body?: string | null;
  link?: string | null;
  /**
   * Stable idempotency key for the in-app row (unique per recipient via
   * notifications_recipient_dedupe_uk). Repeated notify() for the same
   * event+recipient is a no-op — survives occasion regeneration (occasion.id is
   * NOT stable; use company+employee+type+date). Omit for one-off events.
   */
  dedupeKey?: string | null;
  /** Optional email channel; when provided, fired per-recipient email pref. */
  email?: NotifyEmail | null;
}

export interface NotifyResult {
  recipients: number;
  inApp: number;
  emailed: number;
  suppressedEmail: number;
  deferredDigest: number; // email deferred to a digest (digest_frequency != immediate)
}

/**
 * Resolve the audience and, per recipient + their prefs, write an in-app
 * notification and (optionally) send an email. `client` MUST be a service-role
 * client (RLS grants notifications INSERT to service-role only).
 */
export async function notify(
  client: SupabaseClient,
  input: NotifyInput,
): Promise<NotifyResult> {
  const resolved = await resolveAudience(client, input.audience ?? [], {
    companyId: input.companyId,
    departmentId: input.departmentId,
  });
  const recipients = [...new Set([...(input.recipients ?? []), ...resolved])];
  const result: NotifyResult = { recipients: recipients.length, inApp: 0, emailed: 0, suppressedEmail: 0, deferredDigest: 0 };
  if (recipients.length === 0) return result;

  const prefs = await prefsFor(client, recipients, input.type);
  const emailMap = input.email ? await emailsFor(client, recipients) : new Map<string, string>();

  for (const userId of recipients) {
    const pref = prefs.get(userId) ?? DEFAULT_PREF;
    const channels: string[] = [];

    if (pref.in_app) {
      channels.push("in_app");
    }
    // Email channel (only if an email spec was supplied AND pref allows).
    // digest_frequency != 'immediate' DEFERS the email to a rollup (runUserDigests);
    // the in-app row is still written now so the digest can pick it up.
    let willEmail = false;
    if (input.email && pref.email && pref.digest_frequency !== "immediate") {
      result.deferredDigest += 1; // rolled up later; no immediate send
    } else if (input.email && pref.email) {
      const to = emailMap.get(userId);
      if (to) {
        const dh = input.email.dedupeHours ?? 20;
        const already = await wasEmailSentRecently(to, input.email.template, dh);
        if (!already) {
          const res = await sendNotificationEmail({
            to,
            subject: input.email.subject,
            html: input.email.html,
            template: input.email.template,
            metadata: { type: input.type, company_id: input.companyId ?? null },
          });
          if (res.success) {
            channels.push("email");
            willEmail = true;
          }
        } else {
          willEmail = true; // deduped — treat as satisfied, no double-fire
        }
      }
    } else if (input.email && !pref.email) {
      result.suppressedEmail += 1;
    }

    // Write the in-app row when in_app is enabled (records channels actually sent).
    // Idempotent per (recipient, dedupe_key): a repeated event no-ops on the unique
    // index (23505) rather than accumulating duplicate bell rows.
    if (pref.in_app) {
      const { error } = await client.from("notifications").insert({
        recipient_user_id: userId,
        company_id: input.companyId ?? null,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        channels_sent: channels,
        dedupe_key: input.dedupeKey ?? null,
      });
      if (!error) result.inApp += 1;
      else if (error.code !== "23505") {
        // 23505 = deduped (already notified this recipient for this event) — not an error.
        console.error("[notify] in-app insert failed:", error.message);
      }
    }
    if (willEmail) result.emailed += 1;
  }
  return result;
}

// ── Occasion-at-lead-time trigger (§7) ───────────────────────────────────────
const OCCASION_TYPE_LABEL: Record<string, string> = {
  birthday: "birthday",
  work_anniversary: "work anniversary",
  milestone_anniversary: "milestone anniversary",
  onboarding: "onboarding",
  probation_completion: "probation completion",
  festival: "festival",
  custom: "custom occasion",
};

export interface OccasionForNotify {
  id: string;
  company_id: string;
  employee_id: string | null;
  occasion_type_key: string;
  title: string; // MAY contain the employee name — tenant in-app body only
  date: string; // occasion date (ISO)
}

export interface CompanyForNotify {
  name: string;
  plan?: string | null;
  primary_contact_name?: string | null;
  primary_contact_phone?: string | null;
}

function daysUntil(dateISO: string): number {
  const d = new Date(dateISO);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86_400_000);
}

/**
 * Fire the §7 occasion-at-lead-time IN-APP notifications (the existing
 * company-contact reminder email is preserved separately in the cron — this
 * does NOT email, so there is no double-fire). Tenant audience (hr, org_admin,
 * dept manager) gets a body that MAY name the employee (authorised PII viewers);
 * platform audience gets a reference-style body (org + type + timing, NO
 * employee PII) plus an ops wa.me deep link to the client.
 */
export async function notifyOccasionAtLeadTime(
  client: SupabaseClient,
  occasion: OccasionForNotify,
  company: CompanyForNotify,
): Promise<void> {
  const label = OCCASION_TYPE_LABEL[occasion.occasion_type_key] ?? "gifting occasion";
  const n = daysUntil(occasion.date);
  const inDays = n <= 0 ? "soon" : `in ${n} day${n === 1 ? "" : "s"}`;

  // Resolve the occasion's department (for dept_manager audience) via the employee.
  let departmentId: string | null = null;
  if (occasion.employee_id) {
    const { data: emp } = await client
      .from("employees")
      .select("department_id")
      .eq("id", occasion.employee_id)
      .maybeSingle();
    departmentId = (emp?.department_id as string | null) ?? null;
  }

  // Stable identity across occasion regeneration (occasion.id is NOT stable).
  const stable = stableOccasionKey(occasion);

  // TENANT — title reference-style; body may name the person (occasion.title).
  await notify(client, {
    type: NOTIFICATION_TYPES.OCCASION_REMINDER,
    audience: [
      { plane: "tenant", role: "hr" },
      { plane: "tenant", role: "org_admin" },
      { plane: "tenant", role: "org_owner" },
      ...(departmentId ? ([{ plane: "tenant", role: "dept_manager" }] as AudienceSpec[]) : []),
    ],
    companyId: occasion.company_id,
    departmentId,
    title: `Upcoming ${label} ${inDays}`,
    body: occasion.title, // authorised tenant PII viewers only (RLS)
    link: "/dashboard/occasions",
    dedupeKey: `occ:${stable}`,
  });

  // PLATFORM — reference-style ONLY (no employee PII); ops wa.me deep link.
  const wa = buildOpsWaLink({
    clientPhone: company.primary_contact_phone,
    orgName: company.name,
    plan: company.plan,
    contactName: company.primary_contact_name,
    occasionType: label,
  });
  await notify(client, {
    type: NOTIFICATION_TYPES.OCCASION_OPS,
    audience: [{ plane: "platform", role: "platform_admin" }],
    companyId: occasion.company_id,
    title: `${company.name}: upcoming ${label}`,
    body: `An upcoming ${label} for ${company.name}${company.plan ? ` (${company.plan})` : ""} ${inDays}.`,
    link: wa, // may be null when the client has no phone — omitted gracefully
    dedupeKey: `occops:${stable}`,
  });
}

async function emailsFor(
  client: SupabaseClient,
  userIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;
  const { data } = await client.from("profiles").select("id, email").in("id", userIds);
  for (const r of data ?? []) {
    if (r.email) map.set(r.id as string, r.email as string);
  }
  return map;
}

function addDaysISO(base: string, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Gift-state signal (§7 escalation reads this) ─────────────────────────────
/**
 * Does a (non-cancelled) gift-state row exist for this occasion's STABLE key?
 * Survives occasion regeneration (keyed on stable identity, not occasions.id).
 * The real write is P7 (quote->order); 6b proves the read via synthetic rows.
 */
export async function giftChosenFor(
  client: SupabaseClient,
  occasion: StableOccasion,
): Promise<boolean> {
  const key = stableOccasionKey(occasion);
  const { count } = await client
    .from("occasion_gift_state")
    .select("id", { count: "exact", head: true })
    .eq("stable_key", key)
    .neq("status", "cancelled");
  return (count ?? 0) > 0;
}

/**
 * Write the "gift chosen" signal for an occasion (Prompt 7a — the P6 obligation). Called when a
 * tenant requests a quote FOR an occasion → escalation stages 2/3 SUPPRESS. Idempotent on the
 * stable key. `client` MUST be service-role (RLS grants occasion_gift_state write to
 * owner/admin/hr or service; system writes use service). status='ordered' once an order exists.
 */
export async function writeGiftChosen(
  client: SupabaseClient,
  occasion: { company_id: string; employee_id: string | null; occasion_type_key: string; date: string; title?: string | null },
  opts: { quoteId?: string | null; orderId?: string | null; chosenBy?: string | null },
): Promise<void> {
  const key = stableOccasionKey(occasion);
  const { error } = await client.from("occasion_gift_state").upsert(
    {
      stable_key: key,
      company_id: occasion.company_id,
      employee_id: occasion.employee_id,
      occasion_type_key: occasion.occasion_type_key,
      occasion_date: occasion.date,
      status: opts.orderId ? "ordered" : "chosen",
      quote_id: opts.quoteId ?? null,
      order_id: opts.orderId ?? null,
      chosen_by: opts.chosenBy ?? null,
    },
    { onConflict: "stable_key" },
  );
  if (error) throw new Error(`writeGiftChosen: ${error.message}`);
}

/**
 * REVERSAL (Prompt 7a ruling): when a quote is cancelled/rejected and NO order resulted, CLEAR the
 * gift-state so giftChosenFor() → false and escalation RESUMES (a fallen-through quote is a
 * forgotten occasion — exactly what the ladder must catch). Only clears rows with NO order_id
 * (a converted-to-order gift is committed and persists). Returns how many rows were cleared.
 */
export async function clearGiftChosenForQuote(
  client: SupabaseClient,
  quoteId: string,
): Promise<{ cleared: number }> {
  const { data, error } = await client
    .from("occasion_gift_state")
    .delete()
    .eq("quote_id", quoteId)
    .is("order_id", null)
    .select("id");
  if (error) throw new Error(`clearGiftChosenForQuote: ${error.message}`);
  return { cleared: (data ?? []).length };
}

/**
 * A quote converted to an order → the gift is committed: mark the gift-state 'ordered' + link the
 * order so the cancel-reversal never clears it. Idempotent.
 */
export async function markGiftOrderedForQuote(
  client: SupabaseClient,
  quoteId: string,
  orderId: string,
): Promise<void> {
  await client
    .from("occasion_gift_state")
    .update({ status: "ordered", order_id: orderId })
    .eq("quote_id", quoteId);
}

// ── §7 escalation ladder (stages 2 & 3; stage 1 = notifyOccasionAtLeadTime) ──
export interface OccasionForEscalation extends OccasionForNotify {
  lead_days: number;
}

export interface EscalationResult {
  suppressed: boolean; // gift chosen -> stages 2/3 do not fire
  stage2Fired: boolean;
  stage3Fired: boolean;
}

async function fireEscalationStage(
  client: SupabaseClient,
  occasion: OccasionForEscalation,
  company: CompanyForNotify,
  stable: string,
  stage: 2 | 3,
  tenantRoles: TenantRole[],
  platformRole: PlatformAudience,
): Promise<void> {
  const label = OCCASION_TYPE_LABEL[occasion.occasion_type_key] ?? "gifting occasion";
  const n = daysUntil(occasion.date);
  const inDays = n <= 0 ? "soon" : `in ${n} day${n === 1 ? "" : "s"}`;
  const prefix = stage === 3 ? "URGENT: " : "Action needed: ";
  // TENANT — reference-style title; body may name the person (authorised).
  await notify(client, {
    type: NOTIFICATION_TYPES.OCCASION_ESCALATION,
    audience: tenantRoles.map((r) => ({ plane: "tenant", role: r }) as AudienceSpec),
    companyId: occasion.company_id,
    title: `${prefix}${label} ${inDays} — no gift chosen`,
    body: occasion.title, // authorised tenant PII viewers only (RLS)
    link: "/dashboard/occasions",
    dedupeKey: `occ-esc:${stable}:${stage}`,
  });
  // PLATFORM — PII-free; ops wa.me deep link.
  const wa = buildOpsWaLink({
    clientPhone: company.primary_contact_phone,
    orgName: company.name,
    plan: company.plan,
    contactName: company.primary_contact_name,
    occasionType: label,
  });
  await notify(client, {
    type: NOTIFICATION_TYPES.OCCASION_ESCALATION_OPS,
    audience: [{ plane: "platform", role: platformRole }],
    companyId: occasion.company_id,
    title: `${prefix}${company.name}: ${label}`,
    body: `No gift chosen yet for an upcoming ${label} at ${company.name}${company.plan ? ` (${company.plan})` : ""} ${inDays}.`,
    link: wa,
    dedupeKey: `occ-escops:${stable}:${stage}`,
  });
}

/**
 * §7 escalation for one upcoming occasion, evaluated against `today`:
 *  - Stage 2 at occasion_date - floor(lead_days/2): hr + org_admin + platform_admin.
 *  - Stage 3 at occasion_date - 3: hr + org_owner + platform_owner (urgent).
 * SUPPRESSED entirely if a gift has been chosen (giftChosenFor). Each stage is
 * deduped per-stage (occ-esc:{stable}:{stage}) so a repeated scan never re-fires.
 * Reads occasion.lead_days + occasion_type_key from the occasion row (NOT the
 * reminder, whose type collapses milestone/onboarding/probation).
 */
export async function runOccasionEscalation(
  client: SupabaseClient,
  occasion: OccasionForEscalation,
  company: CompanyForNotify,
  today: string,
): Promise<EscalationResult> {
  const out: EscalationResult = { suppressed: false, stage2Fired: false, stage3Fired: false };
  // Only escalate BEFORE the occasion date (a past/today occasion is out of the window).
  if (today >= occasion.date) return out;
  if (await giftChosenFor(client, occasion)) {
    out.suppressed = true;
    return out; // gift chosen -> stop escalation (the whole point)
  }
  const stable = stableOccasionKey(occasion);
  const half = Math.floor((occasion.lead_days ?? 14) / 2);
  const stage2Date = addDaysISO(occasion.date, -half);
  const stage3Date = addDaysISO(occasion.date, -3);
  if (today >= stage2Date) {
    await fireEscalationStage(client, occasion, company, stable, 2, ["hr", "org_admin"], "platform_admin");
    out.stage2Fired = true;
  }
  if (today >= stage3Date) {
    await fireEscalationStage(client, occasion, company, stable, 3, ["hr", "org_owner"], "platform_owner");
    out.stage3Fired = true;
  }
  return out;
}

// ── Digests (§7) ─────────────────────────────────────────────────────────────
/**
 * Platform daily digest — an IN-APP aggregate to platform_admin of ALL orgs'
 * upcoming occasions (next 45 days). PII-SAFE: counts + types only, never an
 * employee name. Idempotent per day (dedupeKey platdigest:{today}).
 */
export async function runPlatformDigest(
  client: SupabaseClient,
  today: string,
): Promise<NotifyResult> {
  const horizon = addDaysISO(today, 45);
  const { data: occ } = await client
    .from("occasions")
    .select("occasion_type_key, company_id")
    .gte("date", today)
    .lte("date", horizon);
  const rows = occ ?? [];
  const total = rows.length;
  const orgs = new Set(rows.map((o) => o.company_id as string)).size;
  const byType = rows.reduce((m: Record<string, number>, o) => {
    const k = OCCASION_TYPE_LABEL[o.occasion_type_key as string] ?? (o.occasion_type_key as string);
    m[k] = (m[k] ?? 0) + 1;
    return m;
  }, {});
  const breakdown = Object.entries(byType).map(([k, v]) => `${v} ${k}`).join(", ") || "none";
  return notify(client, {
    type: NOTIFICATION_TYPES.PLATFORM_DIGEST,
    audience: [{ plane: "platform", role: "platform_admin" }],
    companyId: null,
    title: `Daily digest: ${total} upcoming gifting moment${total === 1 ? "" : "s"} across ${orgs} org${orgs === 1 ? "" : "s"}`,
    body: `Next 45 days — ${breakdown}.`,
    link: "/ops",
    dedupeKey: `platdigest:${today}`,
  });
}

/**
 * Per-user digest rollup: users with notification_prefs.digest_frequency =
 * `frequency` get ONE email summarising their in-app notifications in the window
 * (24h daily / 168h weekly) instead of per-event emails. Titles are
 * reference-style (PII-safe). Deduped per user per window via email_log.
 */
export async function runUserDigests(
  client: SupabaseClient,
  frequency: "daily" | "weekly",
): Promise<{ users: number; sent: number }> {
  const windowH = frequency === "daily" ? 24 : 168;
  const since = new Date(Date.now() - windowH * 3_600_000).toISOString();
  const { data: prefs } = await client
    .from("notification_prefs")
    .select("user_id")
    .eq("digest_frequency", frequency);
  const userIds = [...new Set((prefs ?? []).map((p) => p.user_id as string))];
  let sent = 0;
  const template = `user_digest_${frequency}`;
  for (const uid of userIds) {
    const { data: notifs } = await client
      .from("notifications")
      .select("title, created_at")
      .eq("recipient_user_id", uid)
      .gte("created_at", since)
      .order("created_at", { ascending: false });
    if (!notifs || notifs.length === 0) continue;
    const { data: prof } = await client.from("profiles").select("email").eq("id", uid).maybeSingle();
    const to = prof?.email as string | undefined;
    if (!to) continue;
    if (await wasEmailSentRecently(to, template, Math.min(windowH, 20))) continue; // one digest per window
    const titles = (notifs as Array<{ title: string }>).slice(0, 20).map((n) => n.title);
    const html = `<p>You have ${notifs.length} update${notifs.length === 1 ? "" : "s"}:</p><ul>${titles.map((t) => `<li>${t}</li>`).join("")}</ul>`;
    const res = await sendNotificationEmail({
      to,
      subject: `Your ${frequency} Neon Visuals digest — ${notifs.length} update${notifs.length === 1 ? "" : "s"}`,
      html,
      template,
      metadata: { count: notifs.length, frequency },
    });
    if (res.success) sent += 1;
  }
  return { users: userIds.length, sent };
}

// ── §7 order-lifecycle transition notifications (Prompt 7c-i) ────────────────
// Fired from order.ts updateOrderStatus on the real 9-state machine. PII-SAFE (§10.13): titles,
// bodies, subjects, and links carry ONLY the order reference + status + tracking — NEVER employee
// name/dob/phone. Deduped per (recipient, dedupe_key) so re-running a transition scan no-ops.

export interface OrderTransitionNotifyInput {
  orderId: string;
  companyId: string;
  orderNumber: string | null;
  status: "in_production" | "shipped" | "delivered";
  trackingNumber?: string | null;
  courierPartner?: string | null;
}

/**
 * Resolve the dept-manager user_ids for every department represented by an order's recipients
 * (via order_recipients.employee_id → employees.department_id). Reuses resolveAudienceSpec so the
 * §7 dept_manager resolution stays single-sourced. Company-scoped (tenant isolation).
 */
async function resolveOrderDeptManagers(
  client: SupabaseClient,
  orderId: string,
  companyId: string,
): Promise<string[]> {
  const { data: recips } = await client
    .from("order_recipients")
    .select("employee_id")
    .eq("order_id", orderId);
  const empIds = [
    ...new Set((recips ?? []).map((r) => r.employee_id as string | null).filter((x): x is string => Boolean(x))),
  ];
  if (empIds.length === 0) return [];
  const { data: emps } = await client.from("employees").select("department_id").in("id", empIds);
  const deptIds = [
    ...new Set((emps ?? []).map((e) => e.department_id as string | null).filter((x): x is string => Boolean(x))),
  ];
  const ids = new Set<string>();
  for (const departmentId of deptIds) {
    const managerIds = await resolveAudienceSpec(
      client,
      { plane: "tenant", role: "dept_manager" },
      { companyId, departmentId },
    );
    for (const id of managerIds) ids.add(id);
  }
  return [...ids];
}

/**
 * Fire the §7 notification for an order status transition. `client` MUST be service-role.
 *   in_production → hr (in-app)
 *   shipped       → hr + dept managers of the order's recipient departments (email + in-app, tracking)
 *   delivered     → hr (in-app)
 * Returns the NotifyResult (or null for a status with no §7 row).
 */
export async function notifyOrderStatusChange(
  client: SupabaseClient,
  input: OrderTransitionNotifyInput,
): Promise<NotifyResult | null> {
  const ref = input.orderNumber ?? input.orderId;
  const link = `/dashboard/orders/${input.orderId}`;

  if (input.status === "in_production") {
    return notify(client, {
      type: NOTIFICATION_TYPES.ORDER_IN_PRODUCTION,
      audience: [{ plane: "tenant", role: "hr" }],
      companyId: input.companyId,
      title: `Order ${ref} is in production`,
      body: `Your gifting order ${ref} has entered production.`,
      link,
      dedupeKey: `order:${input.orderId}:in_production`,
    });
  }

  if (input.status === "delivered") {
    return notify(client, {
      type: NOTIFICATION_TYPES.ORDER_DELIVERED,
      audience: [{ plane: "tenant", role: "hr" }],
      companyId: input.companyId,
      title: `Order ${ref} delivered`,
      body: `Your gifting order ${ref} has been delivered.`,
      link,
      dedupeKey: `order:${input.orderId}:delivered`,
    });
  }

  // shipped (= §7 "Dispatched + tracking") → hr + dept managers, email + in-app.
  const deptManagerIds = await resolveOrderDeptManagers(client, input.orderId, input.companyId);
  const trackingLine = input.trackingNumber
    ? ` Tracking: ${input.trackingNumber}${input.courierPartner ? ` (${input.courierPartner})` : ""}.`
    : "";
  const subject = `Order ${ref} dispatched`;
  return notify(client, {
    type: NOTIFICATION_TYPES.ORDER_DISPATCHED,
    audience: [{ plane: "tenant", role: "hr" }],
    recipients: deptManagerIds,
    companyId: input.companyId,
    title: subject,
    body: `Your gifting order ${ref} has been dispatched.${trackingLine}`,
    link,
    dedupeKey: `order:${input.orderId}:dispatched`,
    email: {
      subject,
      html: `<p>Order ${ref} has been dispatched.${trackingLine}</p><p><a href="${link}">Track your order</a></p>`,
      template: "order_dispatched",
    },
  });
}

/**
 * §7 "Proof photos ready" SEAM (Prompt 7c-i). The email-with-images upload flow is 7c-ii; this
 * helper is the hook 7c-ii calls after ops uploads QC proof photos. hr/org_admin, email + in-app,
 * PII-safe (order ref only). Not called in phase i.
 */
export async function notifyProofPhotosReady(
  client: SupabaseClient,
  input: { orderId: string; companyId: string; orderNumber: string | null; imageUrls?: string[] },
): Promise<NotifyResult> {
  const ref = input.orderNumber ?? input.orderId;
  const link = `/dashboard/orders/${input.orderId}`;
  // Scoped (signed) image URLs embedded in the email — time-limited, no employee PII, no public
  // bucket URL. Subject/link stay reference-style.
  const imgs = (input.imageUrls ?? []).slice(0, 10);
  const imgHtml = imgs.map((u) => `<p><img src="${u}" alt="Proof photo for order ${ref}" style="max-width:480px" /></p>`).join("");
  return notify(client, {
    type: NOTIFICATION_TYPES.ORDER_PROOF_PHOTOS_READY,
    audience: [
      { plane: "tenant", role: "hr" },
      { plane: "tenant", role: "org_admin" },
    ],
    companyId: input.companyId,
    title: `Proof photos ready for order ${ref}`,
    body: `Proof photos for your gifting order ${ref} are ready to review.`,
    link,
    dedupeKey: `order:${input.orderId}:proof_photos_ready`,
    email: {
      subject: `Proof photos ready for order ${ref}`,
      html: `<p>Proof photos for order ${ref} are ready.</p>${imgHtml}<p><a href="${link}">Review proof photos</a></p>`,
      template: "order_proof_photos_ready",
    },
  });
}
