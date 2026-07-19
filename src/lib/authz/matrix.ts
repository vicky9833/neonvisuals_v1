/**
 * ============================================================================
 * TWO-PLANE PERMISSION MATRIX — single source of truth (Prompt 2, item 1)
 * ============================================================================
 * Encodes the authoritative §6A (tenant) and §6B (platform) rules VERBATIM from
 * the spec supplement. This is the ONLY place role → capability logic lives.
 * No role checks may be written inline anywhere else in the app.
 *
 * This module is PURE and import-safe from both server and client (no
 * `server-only`, no Supabase, no `next/*`). The request-scoped principal is
 * assembled in `authz/context.ts` (server-only) and passed into `authorize()`.
 *
 * Capability decisions are NOT plain booleans. `authorize()` returns a
 * {@link Decision} that is `allow` | `deny`, optionally carrying:
 *   - `conditional`   : which conditional class produced the result
 *   - `audit`         : the decision MUST be written to audit_log (item 3/8)
 *   - `allowedFields` : the field allowlist for a `shipping-only` PII read
 *
 * Three conditional classes are resolved as first-class outcomes:
 *   - own-dept       : manager scoped to their company_members.department_id
 *   - at-most-limit  : hr/manager quote approval gated by approval_limit
 *   - shipping-only  : platform ops PII read scoped to shipping fields (app layer)
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// Role types (canonical). `platform_role` mirrors the DB enum from migration 018.
// `company_role` is introduced here as the tenant plane's TS type. The old
// conflated `"super_admin"|"admin"|"client"` Role type is NOT extended.
// ---------------------------------------------------------------------------
export type PlatformRole = "owner" | "admin" | "ops" | "finance" | "support";

export type CompanyRole =
  | "org_owner"
  | "org_admin"
  | "hr"
  | "finance"
  | "manager"
  | "viewer";

export const COMPANY_ROLES: readonly CompanyRole[] = [
  "org_owner",
  "org_admin",
  "hr",
  "finance",
  "manager",
  "viewer",
] as const;

export const PLATFORM_ROLES: readonly PlatformRole[] = [
  "owner",
  "admin",
  "ops",
  "finance",
  "support",
] as const;

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------
export type TenantCapability =
  | "settings.manage" // Company settings / branding
  | "members.invite" // Invite / remove members
  | "members.change_role" // Change member roles
  | "org.delete" // Delete organisation
  | "employees.edit" // Add / edit employees
  | "employees.bulk_import" // Bulk import (Pro)
  | "employees.view_pii" // View employee DOB / phone / address
  | "occasions.manage" // Manage occasions & calendar
  | "gifts.assign" // Assign gifts / build kits
  | "quote.request" // Request quote
  | "quote.approve" // Approve quote / spend
  | "billing.manage" // Billing, plan, invoices
  | "dashboards.view" // View dashboards / gift history
  | "employees.export" // Export employee data
  | "concierge.raise"; // Raise concierge request

export type PlatformCapability =
  | "platform.staff.manage" // Create / remove platform staff
  | "platform.orgs.view_all" // See all organisations
  | "platform.all_features" // All features of all tiers, free
  | "platform.plan_override" // Grant plan override (free Pro to an org)
  | "platform.catalog.manage" // Product catalog / pricing
  | "platform.orders.manage" // Order status, proof photos, dispatch
  | "platform.billing.manage" // Quotes, invoices, refunds
  | "platform.concierge.inbox" // Concierge inbox
  | "platform.pii.read" // Read tenant employee PII
  | "platform.impersonate" // Impersonate tenant user
  | "platform.demo_sandbox" // Create / reset demo sandbox org
  // P10a — named granularity for the /ops admin surface (replaces the requireApiRole
  // super_admin shim). All gate PLATFORM-STAFF (Y for all five roles) — preserving the
  // prior staff-membership access exactly while making each domain a first-class capability.
  | "platform.leads.manage" // Leads CRM (create/read/update/convert)
  | "platform.pricing.view" // Internal pricing calculator
  | "platform.settings.manage" // System settings + email test
  | "platform.content.manage" // Blog / CMS content
  | "platform.products.manage" // Product catalog admin (list/edit/images)
  | "platform.analytics.view"; // Ops analytics dashboards

export type Capability = TenantCapability | PlatformCapability;

// ---------------------------------------------------------------------------
// Matrix cell markers
// ---------------------------------------------------------------------------
/** Y=allow · N=deny · own-dept/limit/shipping-only = conditional class. */
type TenantCell = "Y" | "N" | "own-dept" | "limit";
type PlatformCell = "Y" | "N" | "shipping-only";

/**
 * Platform capabilities whose ALLOW is cross-tenant (or impersonation) and MUST
 * emit an audit_log row (spec Y* rows + item 3 cross-tenant override sites).
 */
const AUDITED_PLATFORM_CAPS: ReadonlySet<PlatformCapability> = new Set<PlatformCapability>([
  "platform.orgs.view_all",
  "platform.orders.manage",
  "platform.billing.manage",
  "platform.pii.read",
  "platform.impersonate",
]);

/** shipping-only field allowlist for platform `ops` PII reads (app-layer, item 1). */
export const SHIPPING_ONLY_FIELDS: readonly string[] = [
  "delivery_address",
  "city",
  "pincode",
] as const;

/** Sensitive employee PII columns behind the §6A HARD RULE. */
export const SENSITIVE_PII_FIELDS: readonly string[] = [
  "dob_day",
  "dob_month",
  "phone",
  "delivery_address",
] as const;

// ---------------------------------------------------------------------------
// TENANT PLANE (§6A) — verbatim from the spec supplement
// ---------------------------------------------------------------------------
export const TENANT_MATRIX: Record<TenantCapability, Record<CompanyRole, TenantCell>> = {
  //                     owner  admin  hr        finance  manager     viewer
  "settings.manage":     { org_owner: "Y", org_admin: "Y", hr: "N",     finance: "N", manager: "N",        viewer: "N" },
  "members.invite":      { org_owner: "Y", org_admin: "Y", hr: "N",     finance: "N", manager: "N",        viewer: "N" },
  "members.change_role": { org_owner: "Y", org_admin: "Y", hr: "N",     finance: "N", manager: "N",        viewer: "N" },
  "org.delete":          { org_owner: "Y", org_admin: "N", hr: "N",     finance: "N", manager: "N",        viewer: "N" },
  "employees.edit":      { org_owner: "Y", org_admin: "Y", hr: "Y",     finance: "N", manager: "own-dept", viewer: "N" },
  "employees.bulk_import":{ org_owner: "Y", org_admin: "Y", hr: "Y",    finance: "N", manager: "N",        viewer: "N" },
  // Prompt 4a §6A: full-PII visibility = owner/admin/hr + manager (OWN dept).
  // (Was manager:"N"; realigned to "own-dept" so manager-own-dept can read PII
  // and manager-outside-dept is denied — matching the employee_pii RLS.)
  "employees.view_pii":  { org_owner: "Y", org_admin: "Y", hr: "Y",     finance: "N", manager: "own-dept", viewer: "N" },
  "occasions.manage":    { org_owner: "Y", org_admin: "Y", hr: "Y",     finance: "N", manager: "own-dept", viewer: "N" },
  "gifts.assign":        { org_owner: "Y", org_admin: "Y", hr: "Y",     finance: "N", manager: "own-dept", viewer: "N" },
  "quote.request":       { org_owner: "Y", org_admin: "Y", hr: "Y",     finance: "N", manager: "Y",        viewer: "N" },
  "quote.approve":       { org_owner: "Y", org_admin: "Y", hr: "limit", finance: "Y", manager: "limit",    viewer: "N" },
  "billing.manage":      { org_owner: "Y", org_admin: "Y", hr: "N",     finance: "Y", manager: "N",        viewer: "N" },
  "dashboards.view":     { org_owner: "Y", org_admin: "Y", hr: "Y",     finance: "Y", manager: "own-dept", viewer: "Y" },
  "employees.export":    { org_owner: "Y", org_admin: "Y", hr: "Y",     finance: "N", manager: "N",        viewer: "N" },
  "concierge.raise":     { org_owner: "Y", org_admin: "Y", hr: "Y",     finance: "Y", manager: "Y",        viewer: "N" },
};

// ---------------------------------------------------------------------------
// PLATFORM PLANE (§6B) — verbatim. Y* rows (consented/impersonation) collapse
// to "Y" here; the audit obligation is captured by AUDITED_PLATFORM_CAPS.
// ---------------------------------------------------------------------------
export const PLATFORM_MATRIX: Record<PlatformCapability, Record<PlatformRole, PlatformCell>> = {
  //                          owner  admin  ops              finance  support
  "platform.staff.manage":   { owner: "Y", admin: "N", ops: "N",             finance: "N", support: "N" },
  "platform.orgs.view_all":  { owner: "Y", admin: "Y", ops: "Y",             finance: "Y", support: "Y" },
  "platform.all_features":   { owner: "Y", admin: "Y", ops: "Y",             finance: "Y", support: "Y" },
  "platform.plan_override":  { owner: "Y", admin: "Y", ops: "N",             finance: "N", support: "N" },
  "platform.catalog.manage": { owner: "Y", admin: "Y", ops: "N",             finance: "Y", support: "N" },
  "platform.orders.manage":  { owner: "Y", admin: "Y", ops: "Y",             finance: "N", support: "N" },
  "platform.billing.manage": { owner: "Y", admin: "Y", ops: "N",             finance: "Y", support: "N" },
  "platform.concierge.inbox":{ owner: "Y", admin: "Y", ops: "Y",             finance: "N", support: "Y" },
  "platform.pii.read":       { owner: "Y", admin: "Y", ops: "shipping-only", finance: "N", support: "N" },
  // TODO(P3): impersonation UX — consented red banner, 60-min expiry, org_owner
  // email. This prompt wires only the authorize() decision + audit-write.
  "platform.impersonate":    { owner: "Y", admin: "Y", ops: "N",             finance: "N", support: "Y" },
  "platform.demo_sandbox":   { owner: "Y", admin: "Y", ops: "N",             finance: "N", support: "Y" },
  // P10a — /ops admin surface: platform-staff granted (all five roles), matching the prior
  // requireApiRole staff-membership gate. Loosens nothing; tightens the shim into named caps.
  "platform.leads.manage":   { owner: "Y", admin: "Y", ops: "Y",             finance: "Y", support: "Y" },
  "platform.pricing.view":   { owner: "Y", admin: "Y", ops: "Y",             finance: "Y", support: "Y" },
  "platform.settings.manage":{ owner: "Y", admin: "Y", ops: "Y",             finance: "Y", support: "Y" },
  "platform.content.manage": { owner: "Y", admin: "Y", ops: "Y",             finance: "Y", support: "Y" },
  "platform.products.manage":{ owner: "Y", admin: "Y", ops: "Y",             finance: "Y", support: "Y" },
  "platform.analytics.view": { owner: "Y", admin: "Y", ops: "Y",             finance: "Y", support: "Y" },
};

// ---------------------------------------------------------------------------
// Principal + resource context + decision
// ---------------------------------------------------------------------------
export interface TenantPrincipal {
  plane: "tenant";
  role: CompanyRole;
  /** company_members.department_id of the principal (null = no department). */
  departmentId: string | null;
  /** company_members.approval_limit (null = no approval authority). */
  approvalLimit: number | null;
}

export interface PlatformPrincipal {
  plane: "platform";
  role: PlatformRole;
}

export type Principal = TenantPrincipal | PlatformPrincipal;

export type ConditionalClass = "own-dept" | "at-most-limit" | "shipping-only";

export interface ResourceContext {
  /** Resource's department for the own-dept conditional. */
  resourceDepartmentId?: string | null;
  /** Monetary amount for the at-most-limit conditional (quote total). */
  amount?: number;
  /** PII fields being requested, for the shipping-only conditional. */
  requestedPiiFields?: readonly string[];
}

export interface Decision {
  effect: "allow" | "deny";
  reason?: string;
  /** True when this ALLOW must be recorded in audit_log. */
  audit: boolean;
  /** Which conditional class resolved this decision, if any. */
  conditional?: ConditionalClass;
  /** For a shipping-only ALLOW: the field allowlist the caller may read. */
  allowedFields?: readonly string[];
}

const allow = (extra: Partial<Decision> = {}): Decision => ({ effect: "allow", audit: false, ...extra });
const deny = (reason: string, extra: Partial<Decision> = {}): Decision => ({
  effect: "deny",
  audit: false,
  reason,
  ...extra,
});

function isPlatformCapability(capability: Capability): capability is PlatformCapability {
  return capability.startsWith("platform.");
}

/**
 * Pure authorization decision for `principal` performing `capability` in the
 * optional `resourceCtx`. The single entry point for every route/page/engine.
 */
export function authorize(
  principal: Principal,
  capability: Capability,
  resourceCtx: ResourceContext = {},
): Decision {
  const capIsPlatform = isPlatformCapability(capability);

  // Plane isolation: a tenant principal can never satisfy a platform capability
  // and vice versa. This is what makes a tenant user hitting /ops a hard deny.
  if (capIsPlatform && principal.plane !== "platform") {
    return deny("wrong-plane: tenant principal cannot use a platform capability");
  }
  if (!capIsPlatform && principal.plane !== "tenant") {
    return deny("wrong-plane: platform principal cannot use a tenant capability");
  }

  if (principal.plane === "platform") {
    const cell = PLATFORM_MATRIX[capability as PlatformCapability][principal.role];
    const audited = AUDITED_PLATFORM_CAPS.has(capability as PlatformCapability);
    if (cell === "N") return deny(`platform role '${principal.role}' denied '${capability}'`);
    if (cell === "Y") return allow({ audit: audited });
    // shipping-only (ops PII read)
    const requested = resourceCtx.requestedPiiFields;
    if (requested && requested.length > 0) {
      const overreach = requested.filter((f) => !SHIPPING_ONLY_FIELDS.includes(f));
      if (overreach.length > 0) {
        return deny(`shipping-only: fields not permitted: ${overreach.join(", ")}`, {
          conditional: "shipping-only",
        });
      }
    }
    return allow({
      audit: audited,
      conditional: "shipping-only",
      allowedFields: SHIPPING_ONLY_FIELDS,
    });
  }

  // Tenant plane
  const cell = TENANT_MATRIX[capability as TenantCapability][principal.role];
  if (cell === "N") return deny(`tenant role '${principal.role}' denied '${capability}'`);
  if (cell === "Y") return allow();

  if (cell === "own-dept") {
    if (principal.departmentId == null) {
      return deny("own-dept: principal has no department", { conditional: "own-dept" });
    }
    if (resourceCtx.resourceDepartmentId === undefined) {
      return deny("own-dept: resource department not supplied", { conditional: "own-dept" });
    }
    if (resourceCtx.resourceDepartmentId === principal.departmentId) {
      return allow({ conditional: "own-dept" });
    }
    return deny("own-dept: resource is outside the principal's department", {
      conditional: "own-dept",
    });
  }

  // cell === "limit" (quote approval; only hr/manager reach here — owner/admin/finance are "Y")
  if (principal.approvalLimit == null) {
    return deny("at-most-limit: principal has no approval authority (NULL limit)", {
      conditional: "at-most-limit",
    });
  }
  if (resourceCtx.amount === undefined) {
    return deny("at-most-limit: amount not supplied", { conditional: "at-most-limit" });
  }
  if (resourceCtx.amount <= principal.approvalLimit) {
    return allow({ conditional: "at-most-limit" });
  }
  return deny("at-most-limit: amount exceeds approval_limit", { conditional: "at-most-limit" });
}
