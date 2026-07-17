import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendNotificationEmail, wasEmailSentRecently } from "@/lib/services/email";

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
  MEMBER_INVITED: "member_invited",
  MEMBER_JOINED: "member_joined",
  MEMBER_REMOVED: "member_removed",
  MEMBER_ROLE_CHANGED: "member_role_changed",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

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
}
const DEFAULT_PREF: Pref = { in_app: true, email: true };

async function prefsFor(
  client: SupabaseClient,
  userIds: string[],
  type: string,
): Promise<Map<string, Pref>> {
  const map = new Map<string, Pref>();
  if (userIds.length === 0) return map;
  const { data } = await client
    .from("notification_prefs")
    .select("user_id, in_app, email")
    .in("user_id", userIds)
    .eq("type", type);
  for (const r of data ?? []) {
    map.set(r.user_id as string, { in_app: r.in_app as boolean, email: r.email as boolean });
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
  audience: AudienceSpec[];
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
  const resolved = await resolveAudience(client, input.audience, {
    companyId: input.companyId,
    departmentId: input.departmentId,
  });
  const recipients = [...new Set([...(input.recipients ?? []), ...resolved])];
  const result: NotifyResult = { recipients: recipients.length, inApp: 0, emailed: 0, suppressedEmail: 0 };
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
    let willEmail = false;
    if (input.email && pref.email) {
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
  const stable = `${occasion.company_id}:${occasion.employee_id ?? "cw"}:${occasion.occasion_type_key}:${occasion.date}`;

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
  const { buildOpsWaLink } = await import("@/lib/utils/wa");
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
