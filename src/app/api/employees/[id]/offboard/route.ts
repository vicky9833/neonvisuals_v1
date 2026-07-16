import { NextResponse } from "next/server";
import {
  requireApiAuth,
  tenantCapability,
  apiAuthErrorResponse,
  ApiAuthError,
} from "@/lib/api-auth";
import { getEmployee, offboardEmployee } from "@/lib/employees/queries";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Offboard an employee (Prompt 4b item 6). Gated by employees.edit (owner/admin/hr
 * or manager-own-dept). Sets offboarded_at (trigger stamps purge_after=+90d) and
 * deactivates. The purge executor + anonymised-aggregate retention are DEFERRED.
 */
export async function POST(_request: Request, { params }: Ctx) {
  try {
    const principal = await requireApiAuth();
    const { id } = await params;
    const existing = await getEmployee(id);
    if (!existing) {
      return NextResponse.json({ error: "not_found", message: "Employee not found" }, { status: 404 });
    }
    const decision = tenantCapability(principal, "employees.edit", null, {
      resourceDepartmentId: existing.department_id ?? undefined,
    });
    if (decision.effect !== "allow") {
      throw new ApiAuthError(403, "forbidden", decision.reason ?? "Not permitted.");
    }
    const result = await offboardEmployee(id);
    if (!result) {
      return NextResponse.json({ error: "not_found", message: "Employee not found" }, { status: 404 });
    }
    return NextResponse.json({
      data: { id, is_active: false, offboarded_at: result.offboarded_at, purge_after: result.purge_after },
    });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[employees/offboard]");
    return NextResponse.json({ error: "server_error", message: "Could not offboard employee." }, { status: 500 });
  }
}
