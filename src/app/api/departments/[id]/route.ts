import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenant, apiAuthErrorResponse } from "@/lib/api-auth";
import { getCompanyPlanContext } from "@/lib/employees/queries";
import { canUseDepartments, gateMessage } from "@/lib/employees/plan-gate";
import { updateDepartment, deleteDepartment } from "@/lib/departments/queries";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  manager_id: z.string().uuid().nullable().optional(),
});

async function ensurePro(companyId: string, isPlatformStaff: boolean): Promise<NextResponse | null> {
  const plan = await getCompanyPlanContext(companyId);
  const gate = canUseDepartments({ plan: plan.plan, planStatus: plan.planStatus, planOverrideBy: plan.planOverrideBy, isDemo: plan.isDemo, isPlatformStaff });
  if (!gate.allowed) {
    return NextResponse.json({ error: "plan_gate", reason: gate.reason, message: gateMessage(gate.reason) }, { status: 403 });
  }
  return null;
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const principal = await requireTenant("settings.manage", null);
    const companyId = principal.company_id!;
    const gated = await ensurePro(companyId, principal.isPlatformStaff);
    if (gated) return gated;
    const { id } = await params;
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    await updateDepartment(companyId, id, parsed.data);
    return NextResponse.json({ data: { id } });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const principal = await requireTenant("settings.manage", null);
    const companyId = principal.company_id!;
    const gated = await ensurePro(companyId, principal.isPlatformStaff);
    if (gated) return gated;
    const { id } = await params;
    await deleteDepartment(companyId, id);
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown): NextResponse {
  const authResponse = apiAuthErrorResponse(err);
  if (authResponse) return authResponse;
  console.error("[departments/[id]]", err);
  return NextResponse.json({ error: "server_error", message: "Could not process departments request." }, { status: 500 });
}
