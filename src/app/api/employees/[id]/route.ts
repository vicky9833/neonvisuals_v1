import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import {
  deleteEmployee,
  getEmployee,
  updateEmployee,
} from "@/lib/employees/queries";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  employee_code: z.string().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
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

export async function GET(_request: Request, { params }: Ctx) {
  try {
    await requireApiAuth();
    const { id } = await params;
    const employee = await getEmployee(id);
    if (!employee) {
      return NextResponse.json({ error: "not_found", message: "Employee not found" }, { status: 404 });
    }
    return NextResponse.json({ data: employee });
  } catch (err) {
    return handle(err);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    await requireApiAuth();
    const { id } = await params;
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
    await requireApiAuth();
    const { id } = await params;
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
