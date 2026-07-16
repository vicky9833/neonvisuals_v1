import { NextResponse } from "next/server";
import {
  requireApiAuth,
  requireTenant,
  apiAuthErrorResponse,
} from "@/lib/api-auth";
import {
  parseUploadWithMeta,
  validateHeaders,
  validateCSVRows,
  rowToFormData,
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
} from "@/lib/employees/csv";
import {
  bulkCreateEmployees,
  getCompanyPlanContext,
  recordImportJob,
} from "@/lib/employees/queries";
import { canImport, gateMessage } from "@/lib/employees/plan-gate";
import { scanUploadOrThrow } from "@/lib/employees/upload-scan";
import type { ImportRowError } from "@/types/employee";

export const runtime = "nodejs";

/**
 * Real employee CSV/XLSX import (Prompt 4b item 3). File is parsed IN MEMORY
 * (never persisted), validated, and inserted with phone/delivery_address
 * ENCRYPTED (via bulkCreateEmployees -> encryptPII). Pro-only (§8). All error
 * output is BY-REFERENCE (row/field/code) — NEVER a value (§10.12-13).
 *
 * DEBT (Prompt 4b): there are TWO import write paths — this /upload (multipart,
 * canonical) and /bulk (JSON). Any change to the import write/encrypt/gate/error
 * contract MUST be applied to BOTH. Prompt 10 verifies their equivalence.
 */
export async function POST(request: Request) {
  try {
    const principal = await requireApiAuth();
    const companyId = principal.company_id;
    if (!companyId) {
      return NextResponse.json({ error: "no_company", message: "No company linked to this account." }, { status: 400 });
    }

    // Pro-tier gate (platform staff / override bypass).
    const plan = await getCompanyPlanContext(companyId);
    const gate = canImport({ plan: plan.plan, planStatus: plan.planStatus, planOverrideBy: plan.planOverrideBy, isPlatformStaff: principal.isPlatformStaff });
    if (!gate.allowed) {
      return NextResponse.json({ error: "plan_gate", reason: gate.reason, message: gateMessage(gate.reason) }, { status: 403 });
    }

    // Role gate (owner/admin/hr).
    await requireTenant("employees.bulk_import", null);

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "bad_request", message: "No file provided." }, { status: 400 });
    }
    if (file.size > IMPORT_MAX_BYTES) {
      return NextResponse.json({ error: "file_too_large", message: "File exceeds the 5MB limit." }, { status: 413 });
    }
    const lower = file.name.toLowerCase();
    const isXlsx = lower.endsWith(".xlsx") || lower.endsWith(".xls");
    if (!isXlsx && !lower.endsWith(".csv")) {
      return NextResponse.json({ error: "bad_type", message: "Only CSV or Excel files are accepted." }, { status: 400 });
    }
    const source = isXlsx ? "xlsx" : "csv";

    const bytes = await file.arrayBuffer();
    await scanUploadOrThrow(bytes, file.name); // malware-scan seam (see module)

    let rows;
    let headers: string[];
    try {
      const parsed = await parseUploadWithMeta(file.name, bytes);
      rows = parsed.rows;
      headers = parsed.headers;
    } catch {
      return NextResponse.json({ error: "parse_failed", message: "Could not read the file." }, { status: 400 });
    }

    // Header validation (by-reference).
    const headerIssues = validateHeaders(headers);
    if (headerIssues.length > 0) {
      const errs: ImportRowError[] = headerIssues.map((h) => ({ row: 0, field: h.field, code: h.code }));
      await recordImportJob({ companyId, createdBy: principal.id, source, fileSize: file.size, rowsTotal: rows.length, rowsOk: 0, rowsFailed: rows.length, errors: errs });
      return NextResponse.json({ error: "bad_header", message: "The file is missing required columns.", errors: errs }, { status: 422 });
    }

    // Row cap (§10.12).
    if (rows.length > IMPORT_MAX_ROWS) {
      const errs: ImportRowError[] = [{ row: 0, field: "file", code: "row_limit" }];
      await recordImportJob({ companyId, createdBy: principal.id, source, fileSize: file.size, rowsTotal: rows.length, rowsOk: 0, rowsFailed: rows.length, errors: errs });
      return NextResponse.json({ error: "row_limit", message: `Maximum ${IMPORT_MAX_ROWS} employees per upload.`, errors: errs }, { status: 422 });
    }

    // Validate -> split valid/invalid (by-reference errors).
    const validated = validateCSVRows(rows);
    const invalidErrors: ImportRowError[] = validated
      .filter((r) => !r.isValid)
      .flatMap((r) => r.errors.map((e) => ({ row: r.row, field: e.field, code: e.code })));
    const validRows = validated.filter((r) => r.isValid);

    const result = await bulkCreateEmployees(
      companyId,
      validRows.map((r) => rowToFormData(r.data)),
      principal.id,
    );

    const allErrors: ImportRowError[] = [...invalidErrors, ...result.errors];
    const rowsFailed = invalidErrors.length + result.errors.length;
    const jobId = await recordImportJob({
      companyId,
      createdBy: principal.id,
      source,
      fileSize: file.size,
      rowsTotal: rows.length,
      rowsOk: result.created,
      rowsFailed,
      errors: allErrors,
    });

    return NextResponse.json({
      data: {
        jobId,
        rows_total: rows.length,
        rows_ok: result.created,
        skipped: result.skipped,
        rows_failed: rowsFailed,
        errors: allErrors,
      },
    });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[employees/upload]"); // NEVER log err payload — may contain PII
    return NextResponse.json({ error: "server_error", message: "Import failed." }, { status: 500 });
  }
}
