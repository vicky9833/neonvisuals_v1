import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiAuth,
  tenantCapability,
  apiAuthErrorResponse,
  ApiAuthError,
} from "@/lib/api-auth";
import {
  deleteEmployee,
  getEmployee,
  updateEmployee,
} from "@/lib/employees/queries";
import type { Employee } from "@/types/employee";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
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
  is_active: z.boolean().optional(),
});

/** PII fields nulled when the caller lacks employees.view_pii for this employee. */
function stripPii(e: Employee): Employee {
  return {
    ...e,
    phone: null,
    delivery_address: null,
    city: null,
    pincode: null,
    dob_day: null,
    dob_month: null,
    notes: null,
  };
}

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const principal = await requireApiAuth();
    const { id } = await params;
    const employee = await getEmployee(id);
    if (!employee) {
      return NextResponse.json({ error: "not_found", message: "Employee not found" }, { status: 404 });
    }
    // §6A read_pii gate (owner/admin/hr + manager-own-dept). RLS already nulls
    // PII for non-permitted callers; this strips it defensively at the route too.
    const canPii = tenantCapability(principal, "employees.view_pii", null, {
      resourceDepartmentId: employee.department_id ?? undefined,
    });
    return NextResponse.json({
      data: canPii.effect === "allow" ? employee : stripPii(employee),
    });
  } catch (err) {
    return handle(err);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const principal = await requireApiAuth();
    const { id } = await params;
    const existing = await getEmployee(id);
    if (!existing) {
      return NextResponse.json({ error: "not_found", message: "Employee not found" }, { status: 404 });
    }
    // §6A employees.edit (owner/admin/hr, or manager of the employee's department).
    const decision = tenantCapability(principal, "employees.edit", null, {
      resourceDepartmentId: existing.department_id ?? undefined,
    });
    if (decision.effect !== "allow") {
      throw new ApiAuthError(403, "forbidden", decision.reason ?? "Not permitted.");
    }
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid JSON body." },
        { status: 400 },
      );
    }
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    const employee = await updateEmployee(id, parsed.data);
    return NextResponse.json({ data: employee });
  } catch (err) {
    return handle(err);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
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
    await deleteEmployee(id);
    return NextResponse.json({ data: { id, is_active: false } });
  } catch (err) {
    return handle(err);
  }
}

function handle(err: unknown): NextResponse {
  const authResponse = apiAuthErrorResponse(err);
  if (authResponse) return authResponse;
  console.error("[employees/[id]]", err);
  return NextResponse.json(
    { error: "server_error", message: "Failed to process employee request." },
    { status: 500 },
  );
}
