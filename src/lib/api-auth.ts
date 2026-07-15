import "server-only";
import { NextResponse } from "next/server";
import {
  getAuthContext,
  type AuthContext,
  type Membership,
} from "@/lib/authz/context";
import {
  authorize,
  type Capability,
  type PlatformRole,
  type ResourceContext,
} from "@/lib/authz/matrix";
import { writeAudit } from "@/lib/authz/audit";

/**
 * Auth guards for Route Handlers, rebuilt for the two-plane tenancy model
 * (Prompt 2, items 3 & 4). NOTHING here reads `profiles.role` or
 * `profiles.company_id`: identity comes from `platform_staff` +
 * `company_members` via `getAuthContext()`, and every capability decision goes
 * through the `authorize()` matrix (src/lib/authz/matrix.ts).
 *
 * On failure they throw an {@link ApiAuthError} which the route's catch block
 * converts into a JSON response via {@link apiAuthErrorResponse}.
 */
export class ApiAuthError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiAuthError";
    this.status = status;
    this.code = code;
  }
}

/**
 * The authenticated principal exposed to route handlers. `company_id` is the
 * caller's ACTIVE membership company (from `company_members`) — never
 * `profiles.company_id`. `isPlatformStaff` replaces the old
 * `role === "super_admin"` cross-tenant flag.
 */
export interface ApiPrincipal {
  id: string;
  email: string;
  isPlatformStaff: boolean;
  platformRole: PlatformRole | null;
  /** Active tenant company (single-membership), from company_members. */
  company_id: string | null;
  memberships: Membership[];
  ctx: AuthContext;
}

function toPrincipal(ctx: AuthContext): ApiPrincipal {
  return {
    id: ctx.userId,
    email: ctx.email,
    isPlatformStaff: ctx.isPlatformStaff,
    platformRole: ctx.platformRole,
    company_id: ctx.activeCompanyId,
    memberships: ctx.memberships,
    ctx,
  };
}

/** Requires any authenticated user; returns the two-plane principal. */
export async function requireApiAuth(): Promise<ApiPrincipal> {
  const ctx = await getAuthContext();
  if (!ctx) {
    throw new ApiAuthError(401, "unauthenticated", "Authentication required.");
  }
  return toPrincipal(ctx);
}

/**
 * Authorize a PLATFORM-plane capability for the principal and, when the matrix
 * marks the decision as auditable (cross-tenant reads/writes, impersonation —
 * item 3), append an immutable audit_log row. Throws 403 on deny.
 */
export async function auditCrossTenantAccess(
  principal: ApiPrincipal,
  capability: Capability,
  meta: {
    action?: string;
    companyId?: string | null;
    entity?: string;
    entityId?: string;
  } = {},
  resourceCtx?: ResourceContext,
): Promise<void> {
  if (principal.platformRole == null) {
    throw new ApiAuthError(403, "forbidden", "Platform access required.");
  }
  const decision = authorize(
    { plane: "platform", role: principal.platformRole },
    capability,
    resourceCtx,
  );
  if (decision.effect !== "allow") {
    throw new ApiAuthError(403, "forbidden", decision.reason ?? "Not permitted.");
  }
  if (decision.audit) {
    await writeAudit(principal.id, "platform", {
      action: meta.action ?? capability,
      companyId: meta.companyId ?? null,
      entity: meta.entity,
      entityId: meta.entityId,
    });
  }
}

/**
 * Requires a PLATFORM-plane capability. Combines {@link requireApiAuth} with
 * {@link auditCrossTenantAccess}: 401 if unauthenticated, 403 if the platform
 * role is not permitted, and writes an audit row for auditable capabilities.
 * Replaces the old `requireApiRole(["super_admin"])`.
 */
export async function requirePlatform(
  capability: Capability,
  meta: {
    action?: string;
    companyId?: string | null;
    entity?: string;
    entityId?: string;
  } = {},
  resourceCtx?: ResourceContext,
): Promise<ApiPrincipal> {
  const principal = await requireApiAuth();
  await auditCrossTenantAccess(principal, capability, meta, resourceCtx);
  return principal;
}

/**
 * Requires a TENANT-plane capability in the principal's active company.
 * 403 if the caller has no membership there or the role is not permitted.
 * This is the SOLE role gate on tenant writes (RLS write policies are
 * tenant-isolation-only — migration 020), so viewer/finance write attempts
 * are denied here.
 */
export async function requireTenant(
  capability: Capability,
  companyId: string | null,
  resourceCtx?: ResourceContext,
): Promise<ApiPrincipal> {
  const principal = await requireApiAuth();
  const cid = companyId ?? principal.company_id;
  if (!cid) {
    throw new ApiAuthError(403, "no_company", "No company membership.");
  }
  const m = principal.memberships.find((mm) => mm.companyId === cid);
  if (!m) {
    throw new ApiAuthError(403, "forbidden", "No membership in this company.");
  }
  const decision = authorize(
    {
      plane: "tenant",
      role: m.role,
      departmentId: m.departmentId,
      approvalLimit: m.approvalLimit,
    },
    capability,
    resourceCtx,
  );
  if (decision.effect !== "allow") {
    throw new ApiAuthError(403, "forbidden", decision.reason ?? "Not permitted.");
  }
  return principal;
}

/**
 * @deprecated Compatibility shim for platform-only admin routes (blog, catalog,
 * settings, analytics, leads CRM, etc.) not yet mapped to explicit §6B
 * capabilities. It gates on PLATFORM-STAFF MEMBERSHIP — it does NOT read
 * `profiles.role`. Per-capability mapping + audit for the full /ops admin
 * surface lands with the Stage B clamp / P3. The `roles` argument is ignored.
 */
export async function requireApiRole(_roles: readonly string[]): Promise<ApiPrincipal> {
  const principal = await requireApiAuth();
  if (!principal.isPlatformStaff) {
    throw new ApiAuthError(403, "forbidden", "Platform access required.");
  }
  return principal;
}

/** Maps any thrown error to a JSON response, handling ApiAuthError specially. */
export function apiAuthErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof ApiAuthError) {
    return NextResponse.json(
      { error: err.code, message: err.message },
      { status: err.status },
    );
  }
  return null;
}
