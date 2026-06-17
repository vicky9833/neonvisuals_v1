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
    return handle(err, "get_failed");
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    await requireApiAuth();
    const { id } = await params;
    const body = await request.json();
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
    return handle(err, "update_failed");
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    await requireApiAuth();
    const { id } = await params;
    await deleteEmployee(id);
    return NextResponse.json({ data: { id, is_active: false } });
  } catch (err) {
    return handle(err, "delete_failed");
  }
}

function handle(err: unknown, code: string): NextResponse {
  const authResponse = apiAuthErrorResponse(err);
  if (authResponse) return authResponse;
  const message = err instanceof Error ? err.message : "Unknown error";
  return NextResponse.json({ error: code, message }, { status: 500 });
}
