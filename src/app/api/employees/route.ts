import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiAuth,
  requireTenant,
  apiAuthErrorResponse,
} from "@/lib/api-auth";
import {
  createEmployee,
  listEmployees,
  getCompanyPlanContext,
  getEmployeeCount,
} from "@/lib/employees/queries";
import { canManualAdd, gateMessage } from "@/lib/employees/plan-gate";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  employee_code: z.string().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  department_id: z.string().uuid().optional(),
  designation: z.string().optional(),
  date_of_birth: z.string().optional(),
  dob_day: z.number().int().min(1).max(31).optional(),
  dob_month: z.number().int().min(1).max(12).optional(),
  joining_date: z.string().optional(),
  manager_name: z.string().optional(),
  manager_email: z.string().email().optional().or(z.literal("")),
  tshirt_size: z.string().optional(),
  dietary_preference: z.string().optional(),
  hobbies: z.string().optional(),
  interests: z.string().optional(),
  delivery_address: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
});

function requireCompany(companyId: string | null): string {
  if (!companyId) {
    throw Object.assign(new Error("No company linked to this account."), {
      _noCompany: true,
    });
  }
  return companyId;
}

export async function GET(request: Request) {
  try {
    // Identity roster is baseline member access (post-4a employees_read RLS lets
    // any company member read identity; PII is gated per-detail via view_pii).
    const profile = await requireApiAuth();
    const companyId = requireCompany(profile.company_id);
    const { searchParams } = new URL(request.url);

    const result = await listEmployees(companyId, {
      search: searchParams.get("search") ?? undefined,
      departmentId: searchParams.get("departmentId") ?? undefined,
      isActive: searchParams.has("isActive")
        ? searchParams.get("isActive") === "true"
        : undefined,
      sortBy: (searchParams.get("sortBy") as never) ?? undefined,
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") ?? undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
      pageSize: searchParams.get("pageSize")
        ? Number(searchParams.get("pageSize"))
        : undefined,
    });
    return NextResponse.json({ data: result });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid JSON body." },
        { status: 400 },
      );
    }
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    // §6A employees.edit — owner/admin/hr (Y) or manager (own department).
    const profile = await requireTenant("employees.edit", null, {
      resourceDepartmentId: parsed.data.department_id ?? undefined,
    });
    const companyId = requireCompany(profile.company_id);
    // Free-tier manual-add soft cap (§8). Pro/override/platform-staff uncapped.
    const plan = await getCompanyPlanContext(companyId);
    const count = await getEmployeeCount(companyId);
    const gate = canManualAdd({
      plan: plan.plan,
      planStatus: plan.planStatus,
      planOverrideBy: plan.planOverrideBy,
      isDemo: plan.isDemo,
      isPlatformStaff: profile.isPlatformStaff,
      activeCount: count,
      employeeLimit: plan.employeeLimit,
    });
    if (!gate.allowed) {
      return NextResponse.json(
        { error: "plan_gate", reason: gate.reason, message: gateMessage(gate.reason) },
        { status: 403 },
      );
    }
    const employee = await createEmployee(companyId, parsed.data, profile.id);
    return NextResponse.json({ data: employee }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown): NextResponse {
  const authResponse = apiAuthErrorResponse(err);
  if (authResponse) return authResponse;
  if (err && typeof err === "object" && "_noCompany" in err) {
    const message =
      "message" in err && typeof err.message === "string"
        ? err.message
        : "No company linked to this account.";
    return NextResponse.json({ error: "no_company", message }, { status: 400 });
  }
  console.error("[employees]", err);
  return NextResponse.json(
    { error: "server_error", message: "Failed to process employee request." },
    { status: 500 },
  );
}
