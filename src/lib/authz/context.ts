import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  authorize,
  type Capability,
  type CompanyRole,
  type Decision,
  type PlatformRole,
  type Principal,
  type ResourceContext,
} from "@/lib/authz/matrix";

/**
 * Request-scoped authorization context for the two-plane tenancy model
 * (migration 018). Reads the platform plane (platform_staff) and tenant plane
 * (company_members) for the current auth user, then feeds the pure
 * {@link authorize} matrix in `authz/matrix.ts` — the single source of truth.
 *
 * All reads use the request-scoped cookie client so RLS applies. The RLS helper
 * functions (is_platform_staff / user_company_ids) are SECURITY DEFINER, so
 * these membership look-ups never recurse through RLS.
 */

export interface Membership {
  companyId: string;
  role: CompanyRole;
  departmentId: string | null;
  approvalLimit: number | null;
}

export interface AuthContext {
  userId: string;
  email: string;
  isPlatformStaff: boolean;
  platformRole: PlatformRole | null;
  memberships: Membership[];
  /** For now: the single membership's company, or null (multi-company UX lands later). */
  activeCompanyId: string | null;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [staffRes, membersRes] = await Promise.all([
    supabase.from("platform_staff").select("role").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("company_members")
      .select("company_id, role, department_id, approval_limit")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);

  const platformRole = (staffRes.data?.role as PlatformRole | undefined) ?? null;

  const memberships: Membership[] = (membersRes.data ?? []).map((m) => ({
    companyId: m.company_id as string,
    role: m.role as CompanyRole,
    departmentId: (m.department_id as string | null) ?? null,
    approvalLimit:
      m.approval_limit === null || m.approval_limit === undefined
        ? null
        : Number(m.approval_limit),
  }));

  return {
    userId: user.id,
    email: user.email ?? "",
    isPlatformStaff: platformRole !== null,
    platformRole,
    memberships,
    activeCompanyId: memberships.length === 1 ? memberships[0].companyId : null,
  };
}

/**
 * Build the platform-plane {@link Principal} for a context, or null if the user
 * is not platform staff.
 */
export function platformPrincipal(ctx: AuthContext): Principal | null {
  if (ctx.platformRole == null) return null;
  return { plane: "platform", role: ctx.platformRole };
}

/**
 * Build the tenant-plane {@link Principal} for a given company, or null if the
 * user has no active membership in that company.
 */
export function tenantPrincipal(ctx: AuthContext, companyId: string): Principal | null {
  const m = ctx.memberships.find((mm) => mm.companyId === companyId);
  if (!m) return null;
  return {
    plane: "tenant",
    role: m.role,
    departmentId: m.departmentId,
    approvalLimit: m.approvalLimit,
  };
}

/**
 * Convenience: resolve a platform-plane authorization decision for the current
 * context. Returns a hard deny if the user is not platform staff.
 */
export function authorizePlatform(
  ctx: AuthContext,
  capability: Capability,
  resourceCtx: ResourceContext = {},
): Decision {
  const principal = platformPrincipal(ctx);
  if (!principal) {
    return { effect: "deny", audit: false, reason: "not platform staff" };
  }
  return authorize(principal, capability, resourceCtx);
}

/**
 * Convenience: resolve a tenant-plane authorization decision for the current
 * context against a specific company. Returns a hard deny if the user has no
 * membership in that company.
 */
export function authorizeTenant(
  ctx: AuthContext,
  companyId: string,
  capability: Capability,
  resourceCtx: ResourceContext = {},
): Decision {
  const principal = tenantPrincipal(ctx, companyId);
  if (!principal) {
    return { effect: "deny", audit: false, reason: "no membership in company" };
  }
  return authorize(principal, capability, resourceCtx);
}
