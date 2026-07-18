import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenant, apiAuthErrorResponse } from "@/lib/api-auth";
import { getCompanyPlanContext } from "@/lib/employees/queries";
import { canUseDepartments, gateMessage } from "@/lib/employees/plan-gate";
import { listDepartments, createDepartment } from "@/lib/departments/queries";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  manager_id: z.string().uuid().optional().nullable(),
});

/** Pro-gate helper: departments & managers are Pro-only (§8). */
async function ensurePro(companyId: string, isPlatformStaff: boolean): Promise<NextResponse | null> {
  const plan = await getCompanyPlanContext(companyId);
  const gate = canUseDepartments({ plan: plan.plan, planStatus: plan.planStatus, planOverrideBy: plan.planOverrideBy, isDemo: plan.isDemo, isPlatformStaff });
  if (!gate.allowed) {
    return NextResponse.json({ error: "plan_gate", reason: gate.reason, message: gateMessage(gate.reason) }, { status: 403 });
  }
  return null;
}

export async function GET() {
  try {
    const principal = await requireTenant("settings.manage", null);
    const companyId = principal.company_id!;
    const gated = await ensurePro(companyId, principal.isPlatformStaff);
    if (gated) return gated;
    return NextResponse.json({ data: await listDepartments(companyId) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const principal = await requireTenant("settings.manage", null);
    const companyId = principal.company_id!;
    const gated = await ensurePro(companyId, principal.isPlatformStaff);
    if (gated) return gated;
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    const dept = await createDepartment(companyId, parsed.data.name, parsed.data.manager_id ?? null);
    return NextResponse.json({ data: dept }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown): NextResponse {
  const authResponse = apiAuthErrorResponse(err);
  if (authResponse) return authResponse;
  console.error("[departments]", err);
  return NextResponse.json({ error: "server_error", message: "Could not process departments request." }, { status: 500 });
}
