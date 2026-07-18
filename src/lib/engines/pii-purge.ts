import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * §10 PRIVACY — 90-day PII-purge executor (P9c).
 *
 * DELETION-SENSITIVE. Purges the PII of employees whose retention horizon has passed. Eligibility is
 * PROVABLE and NARROW; a row whose eligibility is ambiguous is never touched. Under-purge = compliance
 * note; over-purge = data loss — always err to skip.
 *
 * ELIGIBILITY (exact, ruled): employees.purge_after IS NOT NULL AND purge_after <= now() AND the owning
 * company is NOT a demo/sandbox org (is_demo = false). `purge_after` is stamped by the set_purge_after
 * trigger (migration 018) as offboarded_at + 90d, and NULLed on re-onboard — so active, re-onboarded,
 * and future-horizon employees are all excluded by the predicate. Demo orgs are exempt (sandbox).
 *
 * WHAT IT DESTROYS (ruled):
 *   1. Hard-DELETE the employee_pii row (phone/address AES envelopes + city/pincode/dob/notes).
 *   2. Tombstone-overwrite identity PII left on employees: full_name -> 'Former employee' (NOT NULL),
 *      email/employee_code/manager_name/manager_email -> NULL; null the _deprecated_* legacy PII
 *      columns (dob checks pass on NULL); _deprecated_consent_status is NOT NULL -> sentinel 'purged'.
 *   3. NULL purge_after so the row is ineligible on subsequent passes (idempotency signal). This does
 *      NOT re-fire the trigger (it fires only on UPDATE OF offboarded_at, which we never touch).
 * The employees ROW SURVIVES (anonymized) so gift_records (ON DELETE CASCADE) + aggregate memory are
 * preserved — this is anonymize-in-place, never a row delete.
 *
 * IDEMPOTENT / RE-ENTRANT: a purged row has purge_after = NULL, so a second pass selects it not at all.
 * A re-run is a clean no-op (nothing re-deleted, no error).
 *
 * AUDIT (service-role system actor; NO PII): one audit_log row per purged employee
 * (action='pii.purge', entity='employee_pii', entity_id=<employee_id>, before/after=null) + one
 * per-run summary (action='pii.purge.run', after={purged_count}). entity_id is an opaque UUID, not PII.
 *
 * PII-SAFE LOGS: this module never logs phone/address/name/email/dob — only counts + opaque ids.
 *
 * Runs with the service-role admin client (called from the billing cron, which has no user). Accepts an
 * optional companyIds scope + clock so tests can run it against synthetic companies only, never the
 * global real-tenant set.
 */

const PURGED_NAME = "Former employee";

export interface PurgeResult {
  eligible: number;
  purged: number;
  employeeIds: string[];
}

export async function runPiiPurge(
  admin: SupabaseClient,
  opts?: { companyIds?: string[]; now?: Date },
): Promise<PurgeResult> {
  const nowIso = (opts?.now ?? new Date()).toISOString();

  // Eligible set: non-demo companies, past-horizon, non-null purge_after. The inner join to companies
  // enforces the demo exemption at the query level (a demo employee is never selected).
  let q = admin
    .from("employees")
    .select("id, company_id, companies!inner(is_demo)")
    .not("purge_after", "is", null)
    .lte("purge_after", nowIso)
    .eq("companies.is_demo", false);
  if (opts?.companyIds && opts.companyIds.length > 0) {
    q = q.in("company_id", opts.companyIds);
  }
  const { data: eligible, error: selErr } = await q;
  if (selErr) throw new Error(`pii-purge eligibility query failed: ${selErr.message}`);

  const rows = eligible ?? [];
  const employeeIds: string[] = [];

  for (const e of rows) {
    const empId = e.id as string;
    const companyId = e.company_id as string;

    // 1. Hard-delete the PII envelope row (0 rows if already gone — re-entrant).
    const { error: delErr } = await admin.from("employee_pii").delete().eq("employee_id", empId);
    if (delErr) throw new Error(`pii-purge employee_pii delete failed for ${empId}: ${delErr.message}`);

    // 2. Tombstone identity PII on employees + null the retention horizon (idempotency signal).
    const { error: updErr } = await admin
      .from("employees")
      .update({
        full_name: PURGED_NAME,
        email: null,
        employee_code: null,
        manager_name: null,
        manager_email: null,
        _deprecated_phone: null,
        _deprecated_delivery_address: null,
        _deprecated_city: null,
        _deprecated_pincode: null,
        _deprecated_dob_day: null,
        _deprecated_dob_month: null,
        _deprecated_notes: null,
        _deprecated_profile_notes: null,
        _deprecated_department: null,
        _deprecated_consent_status: "purged",
        purge_after: null,
      })
      .eq("id", empId);
    if (updErr) throw new Error(`pii-purge employees tombstone failed for ${empId}: ${updErr.message}`);

    // 3. Per-employee audit (system actor; opaque subject id; ZERO PII).
    const { error: audErr } = await admin.from("audit_log").insert({
      actor_type: "system",
      actor_user_id: null,
      action: "pii.purge",
      company_id: companyId,
      entity: "employee_pii",
      entity_id: empId,
      before: null,
      after: null,
    });
    if (audErr) throw new Error(`pii-purge audit insert failed for ${empId}: ${audErr.message}`);

    employeeIds.push(empId);
  }

  // Per-run summary audit (count only — not PII). Written even for a zero-purge run for observability.
  const { error: runErr } = await admin.from("audit_log").insert({
    actor_type: "system",
    actor_user_id: null,
    action: "pii.purge.run",
    company_id: null,
    entity: "employee_pii",
    entity_id: null,
    before: null,
    after: { purged_count: employeeIds.length },
  });
  if (runErr) throw new Error(`pii-purge run-summary audit insert failed: ${runErr.message}`);

  return { eligible: rows.length, purged: employeeIds.length, employeeIds };
}
