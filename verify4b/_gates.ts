/**
 * Prompt 4b items 4 (consent), 5 (plan-gate), 6 (offboarding).
 * Run: npx tsx verify4b/_gates.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { canImport, canManualAdd } from "../src/lib/employees/plan-gate";
import { authorize } from "../src/lib/authz/matrix";

const env = Object.fromEntries(
  readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
) as Record<string, string>;
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
let pass = true;
const check = (l: string, c: boolean) => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}`); };

async function main() {
  const { data: co } = await admin.from("companies").insert({ name: `t4b_${runid}_co`, slug: `t4b-${runid}-co`, onboarding_completed: true }).select("id").single();
  const companyId = co!.id as string;
  const { data: emp } = await admin.from("employees").insert({ company_id: companyId, full_name: `t4b_${runid}_e`, email: `t4b_${runid}_e@example.com` }).select("id").single();
  const empId = emp!.id as string;

  console.log("=== ITEM 4: consent_status canonical + CHECK ===");
  // Default = company_asserted (insert without consent_status).
  const { data: piiDefault } = await admin.from("employee_pii").insert({ employee_id: empId, company_id: companyId, phone_enc: "enc:x" }).select("consent_status").single();
  check("default consent_status = company_asserted", piiDefault!.consent_status === "company_asserted");
  // Valid transitions.
  const okConfirmed = await admin.from("employee_pii").update({ consent_status: "employee_confirmed" }).eq("employee_id", empId);
  check("accepts employee_confirmed", !okConfirmed.error);
  const okWithdrawn = await admin.from("employee_pii").update({ consent_status: "withdrawn" }).eq("employee_id", empId);
  check("accepts withdrawn", !okWithdrawn.error);
  // Invalid rejected by CHECK.
  const bad = await admin.from("employee_pii").update({ consent_status: "bogus_value" }).eq("employee_id", empId);
  check("CHECK rejects invalid consent_status", !!bad.error);
  // Duplicate on employees retired.
  const { data: depCol } = await admin.rpc("get_pii_dek", { p_version: 1 }); void depCol; // keep client warm
  const { data: cols } = await admin.from("employees").select("*").eq("id", empId).single();
  check("employees._deprecated_consent_status exists (duplicate retired)", cols !== null && "_deprecated_consent_status" in (cols as object));
  check("employees.consent_status no longer present", !("consent_status" in (cols as object)));

  console.log("\n=== ITEM 5: plan-gate stub ===");
  check("import: Free -> denied (free_plan_import_blocked)", canImport({ plan: "free", isPlatformStaff: false }).reason === "free_plan_import_blocked" && !canImport({ plan: "free", isPlatformStaff: false }).allowed);
  check("import: Pro -> allowed", canImport({ plan: "pro", isPlatformStaff: false }).allowed);
  check("import: override -> allowed", canImport({ plan: "free", planOverrideBy: "u", isPlatformStaff: false }).allowed);
  check("import: platform staff -> allowed (bypass)", canImport({ plan: "free", isPlatformStaff: true }).reason === "platform_bypass");
  check("manual: Free under cap -> allowed", canManualAdd({ plan: "free", isPlatformStaff: false, activeCount: 4, employeeLimit: 5 }).allowed);
  check("manual: Free at cap -> denied (free_cap_reached)", canManualAdd({ plan: "free", isPlatformStaff: false, activeCount: 5, employeeLimit: 5 }).reason === "free_cap_reached");
  check("manual: Pro over free cap -> allowed", canManualAdd({ plan: "pro", isPlatformStaff: false, activeCount: 50, employeeLimit: 5 }).allowed);

  console.log("\n=== ITEM 6: offboarding ===");
  const now = new Date();
  const off = await admin.from("employees").update({ offboarded_at: now.toISOString(), is_active: false }).eq("id", empId).select("offboarded_at, purge_after, is_active").single();
  const oa = new Date(off.data!.offboarded_at as string);
  const pa = new Date(off.data!.purge_after as string);
  const days = Math.round((pa.getTime() - oa.getTime()) / 86_400_000);
  check("offboard stamps purge_after = offboarded_at + 90d (trigger)", days === 90);
  check("offboarded employee is_active=false", off.data!.is_active === false);
  const { data: activeRoster } = await admin.from("employees").select("id").eq("company_id", companyId).eq("is_active", true);
  check("offboarded employee excluded from active roster", !(activeRoster ?? []).some((r) => r.id === empId));
  check("non-edit role (viewer) denied employees.edit", authorize({ plane: "tenant", role: "viewer", departmentId: null, approvalLimit: null }, "employees.edit").effect === "deny");

  // Teardown.
  await admin.from("employee_pii").delete().eq("company_id", companyId);
  await admin.from("employees").delete().eq("company_id", companyId);
  await admin.from("companies").delete().eq("id", companyId);
  const resid = (await admin.from("companies").select("id", { count: "exact", head: true }).ilike("name", "t4b\\_%")).count ?? 0;
  check(`residue companies t4b_ = 0 (got ${resid})`, resid === 0);

  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
