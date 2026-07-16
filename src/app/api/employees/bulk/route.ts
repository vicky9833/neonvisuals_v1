import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenant, apiAuthErrorResponse } from "@/lib/api-auth";
import { bulkCreateEmployees } from "@/lib/employees/queries";

export const runtime = "nodejs";

const rowSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  employee_code: z.string().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  date_of_birth: z.string().optional(),
  dob_day: z.number().int().min(1).max(31).optional(),
  dob_month: z.number().int().min(1).max(12).optional(),
  joining_date: z.string().optional(),
  manager_name: z.string().optional(),
  manager_email: z.string().optional(),
  tshirt_size: z.string().optional(),
  dietary_preference: z.string().optional(),
  hobbies: z.string().optional(),
  interests: z.string().optional(),
  delivery_address: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
});

const bulkSchema = z.object({
  employees: z.array(rowSchema).min(1).max(1000),
});

export async function POST(request: Request) {
  try {
    // §6A employees.bulk_import — owner/admin/hr only (Pro-tier gating is Prompt 4b).
    const profile = await requireTenant("employees.bulk_import", null);
    if (!profile.company_id) {
      return NextResponse.json(
        { error: "no_company", message: "No company linked to this account." },
        { status: 400 },
      );
    }
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid JSON body." },
        { status: 400 },
      );
    }
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    const result = await bulkCreateEmployees(
      profile.company_id,
      parsed.data.employees,
      profile.id,
    );
    return NextResponse.json({ data: result });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[employees/bulk]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to import employees." },
      { status: 500 },
    );
  }
}
