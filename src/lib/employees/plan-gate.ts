/**
 * Pro-tier gate STUB (Prompt 4b item 5, Decision H).
 *
 * CSV/XLSX import is Pro-only (§8); Free tier = manual add only, capped at
 * `employee_limit` (5). Platform staff bypass (§8). This is a STUB with a clear
 * seam for Prompt 8 billing to replace — it reads `companies.plan` /
 * `plan_status` / `plan_override_by` and returns a decision + machine reason.
 * NO billing logic, NO Razorpay here.
 *
 * Pure module (no IO) so it is unit-testable and import-safe. The caller passes
 * the already-fetched company plan fields + the principal's platform-staff flag.
 */

/** Plans that include CSV/XLSX import. Prompt 8 will own the real taxonomy. */
export const PRO_PLANS: ReadonlySet<string> = new Set(["pro", "scale", "enterprise"]);

export interface PlanContext {
  plan: string | null;
  planStatus?: string | null;
  planOverrideBy?: string | null;
  isPlatformStaff: boolean;
}

export interface GateDecision {
  allowed: boolean;
  /** Machine-readable reason code (never a user value). */
  reason:
    | "platform_bypass"
    | "pro_plan"
    | "plan_override"
    | "free_plan_import_blocked"
    | "free_cap_reached"
    | "free_departments_blocked"
    | "free_approvals_blocked"
    | "free_festival_limit";
}

/** True when the company's plan (or an override) includes Pro features. */
export function isProPlan(ctx: Pick<PlanContext, "plan" | "planOverrideBy">): boolean {
  return PRO_PLANS.has((ctx.plan ?? "").toLowerCase()) || Boolean(ctx.planOverrideBy);
}

/** Gate for CSV/XLSX import (Pro-only; platform staff bypass). */
export function canImport(ctx: PlanContext): GateDecision {
  if (ctx.isPlatformStaff) return { allowed: true, reason: "platform_bypass" };
  if (ctx.planOverrideBy) return { allowed: true, reason: "plan_override" };
  if (PRO_PLANS.has((ctx.plan ?? "").toLowerCase())) return { allowed: true, reason: "pro_plan" };
  return { allowed: false, reason: "free_plan_import_blocked" };
}

/**
 * Gate for MANUAL single-add. Available on Free up to `employeeLimit` active
 * employees; Pro/override/platform staff are uncapped here (real quota is
 * Prompt 8). `activeCount` is the current active employee count.
 */
export function canManualAdd(
  ctx: PlanContext & { activeCount: number; employeeLimit: number },
): GateDecision {
  if (ctx.isPlatformStaff) return { allowed: true, reason: "platform_bypass" };
  if (isProPlan(ctx)) return { allowed: true, reason: ctx.planOverrideBy ? "plan_override" : "pro_plan" };
  // Free tier: soft cap at employee_limit.
  if (ctx.activeCount >= ctx.employeeLimit) return { allowed: false, reason: "free_cap_reached" };
  return { allowed: true, reason: "free_plan_import_blocked" }; // allowed under cap
}

/**
 * Departments & managers are Pro-only (§8). Same stub pattern as canImport.
 */
export function canUseDepartments(ctx: PlanContext): GateDecision {
  if (ctx.isPlatformStaff) return { allowed: true, reason: "platform_bypass" };
  if (isProPlan(ctx)) return { allowed: true, reason: ctx.planOverrideBy ? "plan_override" : "pro_plan" };
  return { allowed: false, reason: "free_departments_blocked" };
}

/** Approval workflows are Pro-only (§8). */
export function canUseApprovals(ctx: PlanContext): GateDecision {
  if (ctx.isPlatformStaff) return { allowed: true, reason: "platform_bypass" };
  if (isProPlan(ctx)) return { allowed: true, reason: ctx.planOverrideBy ? "plan_override" : "pro_plan" };
  return { allowed: false, reason: "free_approvals_blocked" };
}

/** Festival calendar cap (§8): Free = 3 festivals opted-in, Pro = unlimited. */
export const FREE_FESTIVAL_LIMIT = 3;
export function festivalLimit(ctx: PlanContext): number {
  if (ctx.isPlatformStaff || isProPlan(ctx)) return Number.POSITIVE_INFINITY;
  return FREE_FESTIVAL_LIMIT;
}

/** Human-facing message for a denied gate (no user values). */
export function gateMessage(reason: GateDecision["reason"]): string {
  switch (reason) {
    case "free_plan_import_blocked":
      return "CSV/Excel import is a Pro feature. Upgrade your plan to import employees in bulk.";
    case "free_cap_reached":
      return "Your Free plan is limited to 5 employees. Upgrade to Pro to add more.";
    case "free_departments_blocked":
      return "Departments & managers are a Pro feature. Upgrade to organise your team.";
    case "free_approvals_blocked":
      return "Approval workflows are a Pro feature. Upgrade to enable spend approvals.";
    case "free_festival_limit":
      return `Your Free plan can track up to ${FREE_FESTIVAL_LIMIT} festivals. Upgrade to Pro for the full calendar.`;
    default:
      return "Allowed.";
  }
}
