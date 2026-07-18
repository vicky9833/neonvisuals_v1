import { NextResponse } from "next/server";
import { requireApiAuth, tenantCapability, apiAuthErrorResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmployeeGiftStats } from "@/lib/engines/memory";
import { getCompanyPlanContext } from "@/lib/employees/queries";
import { giftHistoryWindowStart } from "@/lib/employees/plan-gate";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/employees/[id]/gifts — per-employee gift history (Prompt 7c-rest item 4).
 *
 * §6A PII VISIBILITY (privacy-by-design): gift history reveals the employee's identity + gifts, so
 * it is gated on `employees.view_pii` — owner/admin/hr full, manager OWN-DEPT only, finance/viewer
 * DENIED — matching the employee_pii RLS (NOT the broader dashboards.view, which would leak names
 * to finance/viewer). §8 plan tiering: Free sees the last 3 months, Pro the full history.
 */
export async function GET(_request: Request, { params }: Ctx) {
  try {
    const principal = await requireApiAuth();
    const { id } = await params;
    const companyId = principal.company_id;
    if (!companyId) return NextResponse.json({ error: "no_company", message: "No company membership." }, { status: 400 });

    // Resolve the target employee's company + department for the own-company + own-dept checks.
    const admin = createAdminClient();
    const { data: emp } = await admin.from("employees").select("company_id, department_id").eq("id", id).maybeSingle();
    if (!emp || (emp.company_id as string) !== companyId) {
      return NextResponse.json({ error: "not_found", message: "Employee not found." }, { status: 404 });
    }

    // §6A gate: view_pii with the employee's department (manager own-dept; finance/viewer denied).
    const decision = tenantCapability(principal, "employees.view_pii", companyId, {
      resourceDepartmentId: (emp.department_id as string | null) ?? null,
    });
    if (decision.effect !== "allow") {
      return NextResponse.json({ error: "forbidden", message: "You do not have access to this employee's gift history." }, { status: 403 });
    }

    // §8 plan tiering: Free → last 3 months; Pro/override/platform → full.
    const plan = await getCompanyPlanContext(companyId);
    const since = giftHistoryWindowStart({
      plan: plan.plan,
      planStatus: plan.planStatus,
      planOverrideBy: plan.planOverrideBy,
      isDemo: plan.isDemo,
      isPlatformStaff: principal.isPlatformStaff,
    });

    const stats = await getEmployeeGiftStats(id, { since });
    return NextResponse.json({ data: { ...stats, window: since ? "last_3_months" : "full" } });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[employees/[id]/gifts]", err);
    return NextResponse.json({ error: "server_error", message: "Failed to load employee gift stats." }, { status: 500 });
  }
}
