import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenant, apiAuthErrorResponse } from "@/lib/api-auth";
import {
  bulkCreateEmployees,
  getCompanyPlanContext,
  recordImportJob,
} from "@/lib/employees/queries";
import { canImport, gateMessage } from "@/lib/employees/plan-gate";

export const runtime = "nodejs";

const rowSchema = z.object({
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

/**
 * JSON bulk import (pre-validated rows). Pro-only (§8); phone/delivery_address
 * encrypted on write; records an import_jobs row. Errors are BY-REFERENCE only.
 *
 * DEBT (Prompt 4b): sibling of /upload (multipart). Any change to the import
 * write/encrypt/gate/error contract MUST be applied to BOTH. Prompt 10 verifies
 * their equivalence.
 */
export async function POST(request: Request) {
  try {
    // Role gate (owner/admin/hr).
    const profile = await requireTenant("employees.bulk_import", null);
    const companyId = profile.company_id;
    if (!companyId) {
      return NextResponse.json({ error: "no_company", message: "No company linked to this account." }, { status: 400 });
    }

    // Pro-tier gate (platform staff / override bypass).
    const plan = await getCompanyPlanContext(companyId);
    const gate = canImport({ plan: plan.plan, planStatus: plan.planStatus, planOverrideBy: plan.planOverrideBy, isPlatformStaff: profile.isPlatformStaff });
    if (!gate.allowed) {
      return NextResponse.json({ error: "plan_gate", reason: gate.reason, message: gateMessage(gate.reason) }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "invalid_input", message: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      // Do not echo the payload (may contain PII); report by-reference.
      return NextResponse.json({ error: "invalid_input", message: "One or more rows are invalid." }, { status: 400 });
    }

    const result = await bulkCreateEmployees(companyId, parsed.data.employees, profile.id);
    const jobId = await recordImportJob({
      companyId,
      createdBy: profile.id,
      source: "json",
      rowsTotal: parsed.data.employees.length,
      rowsOk: result.created,
      rowsFailed: result.errors.length,
      errors: result.errors,
    });

    return NextResponse.json({ data: { jobId, created: result.created, skipped: result.skipped, errors: result.errors } });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[employees/bulk]"); // NEVER log err payload — may contain PII
    return NextResponse.json({ error: "server_error", message: "Failed to import employees." }, { status: 500 });
  }
}
