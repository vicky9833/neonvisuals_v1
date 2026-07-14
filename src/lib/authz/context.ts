import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Authorization context for the NEW tenancy model (migration 018).
 *
 * Reads the platform plane (platform_staff) and tenant plane (company_members)
 * for the current auth user. This is the compatibility shim introduced in
 * Prompt 1: nothing consumes it yet. Prompt 2 migrates every call site
 * (proxy.ts, auth.ts, api-auth.ts, the UI menus) off `profiles.role` and onto
 * `getAuthContext()`, then drops `profiles.role`.
 *
 * All reads use the request-scoped cookie client so RLS applies. The RLS helper
 * functions (is_platform_staff / user_company_ids) are SECURITY DEFINER, so
 * these membership look-ups never recurse through RLS.
 */

export type PlatformRole = "owner" | "admin" | "ops" | "finance" | "support";

export type CompanyRole =
  | "org_owner"
  | "org_admin"
  | "hr"
  | "finance"
  | "manager"
  | "viewer";

export interface Membership {
  companyId: string;
  role: CompanyRole;
  departmentId: string | null;
  approvalLimit: number | null;
}

export interface AuthContext {
  userId: string;
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
    supabase
      .from("platform_staff")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle(),
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
    isPlatformStaff: platformRole !== null,
    platformRole,
    memberships,
    activeCompanyId: memberships.length === 1 ? memberships[0].companyId : null,
  };
}
