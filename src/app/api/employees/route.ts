import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { createEmployee, listEmployees } from "@/lib/employees/queries";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
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
    const profile = await requireApiAuth();
    const companyId = requireCompany(profile.company_id);
    const { searchParams } = new URL(request.url);

    const result = await listEmployees(companyId, {
      search: searchParams.get("search") ?? undefined,
      department: searchParams.get("department") ?? undefined,
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
    return errorResponse(err, "list_failed");
  }
}

export async function POST(request: Request) {
  try {
    const profile = await requireApiAuth();
    const companyId = requireCompany(profile.company_id);
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    const employee = await createEmployee(companyId, parsed.data, profile.id);
    return NextResponse.json({ data: employee }, { status: 201 });
  } catch (err) {
    return errorResponse(err, "create_failed");
  }
}

function errorResponse(err: unknown, code: string): NextResponse {
  const authResponse = apiAuthErrorResponse(err);
  if (authResponse) return authResponse;
  if (err && typeof err === "object" && "_noCompany" in err) {
    const message =
      "message" in err && typeof err.message === "string"
        ? err.message
        : "No company linked to this account.";
    return NextResponse.json({ error: "no_company", message }, { status: 400 });
  }
  const message = err instanceof Error ? err.message : "Unknown error";
  return NextResponse.json({ error: code, message }, { status: 500 });
}
