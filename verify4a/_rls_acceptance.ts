/**
 * Prompt 4a items 3 + 6 acceptance.
 *  - Item 3 (DB RLS, real JWTs): §6A on employee_pii — owner/admin/hr + manager
 *    (own dept) can SELECT a t4a_ pii row; finance/viewer/other-dept-manager get 0.
 *    Identity (employees) is all-member readable.
 *  - Item 6 (authorize() matrix, the route gate logic): read_pii allowed for
 *    owner/admin/hr, denied for finance/viewer; edit + bulk_import gating.
 * All rows prefixed t4a_<runid>_ and deleted at the end (zero residue proof).
 * Never prints real PII (synthetic only) or the key.
 * Run: npx tsx verify4a/_rls_acceptance.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { authorize, type CompanyRole } from "../src/lib/authz/matrix";
import { encryptWithKey } from "../src/lib/services/pii-crypto-core";

function env() {
  return Object.fromEntries(
    readFileSync("c:/neonvisuals_v1/.env.local", "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  ) as Record<string, string>;
}

const e = env();
const URL_ = e.NEXT_PUBLIC_SUPABASE_URL;
const ANON = e.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SRK = e.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SRK, { auth: { persistSession: false, autoRefreshToken: false } });
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const PW = `T4a!${runid}!pw`;

let pass = true;
const check = (label: string, cond: boolean) => {
  if (!cond) pass = false;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}`);
};

async function mkUser(tag: string): Promise<string> {
  const email = `t4a_${runid}_${tag}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
  if (error) throw new Error(`${tag}: ${error.message}`);
  return data.user.id;
}
async function asUser(tag: string): Promise<SupabaseClient> {
  const c = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email: `t4a_${runid}_${tag}@example.com`, password: PW });
  if (error) throw new Error(`signin ${tag}: ${error.message}`);
  return c;
}
const piiCount = async (c: SupabaseClient, companyId: string) =>
  (await c.from("employee_pii").select("employee_id", { count: "exact", head: true }).eq("company_id", companyId)).count ?? 0;
const canSee = async (c: SupabaseClient, employeeId: string) =>
  ((await c.from("employee_pii").select("employee_id").eq("employee_id", employeeId)).data ?? []).length > 0;

async function main() {
  // ---- seed ----
  const { data: co } = await admin
    .from("companies")
    .insert({ name: `t4a_${runid}_co`, slug: `t4a-${runid}-co`, onboarding_completed: true })
    .select("id").single();
  const companyId = co!.id as string;

  const { data: depts } = await admin.from("departments").insert([
    { company_id: companyId, name: `t4a_${runid}_Engineering` },
    { company_id: companyId, name: `t4a_${runid}_Design` },
  ]).select("id, name");
  const deptEng = depts!.find((d) => d.name.endsWith("Engineering"))!.id as string;
  const deptDesign = depts!.find((d) => d.name.endsWith("Design"))!.id as string;

  const owner = await mkUser("owner");
  const adminU = await mkUser("admin");
  const hr = await mkUser("hr");
  const finance = await mkUser("finance");
  const viewer = await mkUser("viewer");
  const mgrEng = await mkUser("mgrEng");
  const mgrDesign = await mkUser("mgrDesign");

  await admin.from("company_members").insert([
    { company_id: companyId, user_id: owner, role: "org_owner", status: "active" },
    { company_id: companyId, user_id: adminU, role: "org_admin", status: "active" },
    { company_id: companyId, user_id: hr, role: "hr", status: "active" },
    { company_id: companyId, user_id: finance, role: "finance", status: "active" },
    { company_id: companyId, user_id: viewer, role: "viewer", status: "active" },
    { company_id: companyId, user_id: mgrEng, role: "manager", status: "active", department_id: deptEng },
    { company_id: companyId, user_id: mgrDesign, role: "manager", status: "active", department_id: deptDesign },
  ]);

  const { data: emps } = await admin.from("employees").insert([
    { company_id: companyId, full_name: `t4a_${runid}_EngPerson`, department_id: deptEng },
    { company_id: companyId, full_name: `t4a_${runid}_DesignPerson`, department_id: deptDesign },
  ]).select("id, full_name");
  const empEng = emps!.find((x) => x.full_name.endsWith("EngPerson"))!.id as string;
  const empDesign = emps!.find((x) => x.full_name.endsWith("DesignPerson"))!.id as string;

  // Real ciphertext envelopes (prove the PII row holds encrypted data, not plaintext).
  const { data: keyB64 } = await admin.rpc("get_pii_dek", { p_version: 1 });
  const key = Buffer.from(keyB64 as string, "base64");
  const encEng = encryptWithKey(key, 1, `t4a synthetic phone eng ${runid}`);
  await admin.from("employee_pii").insert([
    { employee_id: empEng, company_id: companyId, phone_enc: encEng, city: "Bengaluru", pincode: "560001", dob_day: 12, dob_month: 6, notes: "t4a note eng" },
    { employee_id: empDesign, company_id: companyId, phone_enc: encryptWithKey(key, 1, "synthetic design"), city: "Bengaluru", dob_day: 3, dob_month: 9 },
  ]);

  console.log("=== ITEM 3: employee_pii RLS (§6A) via real JWT sessions ===");
  const cOwner = await asUser("owner");
  const cAdmin = await asUser("admin");
  const cHr = await asUser("hr");
  const cFinance = await asUser("finance");
  const cViewer = await asUser("viewer");
  const cMgrEng = await asUser("mgrEng");
  const cMgrDesign = await asUser("mgrDesign");

  check("owner sees BOTH pii rows", (await piiCount(cOwner, companyId)) === 2);
  check("org_admin sees BOTH pii rows", (await piiCount(cAdmin, companyId)) === 2);
  check("hr sees BOTH pii rows", (await piiCount(cHr, companyId)) === 2);
  check("finance sees ZERO pii rows (leak closed)", (await piiCount(cFinance, companyId)) === 0);
  check("viewer sees ZERO pii rows", (await piiCount(cViewer, companyId)) === 0);
  check("manager(Eng) sees own-dept pii (Eng)", await canSee(cMgrEng, empEng));
  check("manager(Eng) DENIED other-dept pii (Design)", !(await canSee(cMgrEng, empDesign)));
  check("manager(Design) sees own-dept pii (Design)", await canSee(cMgrDesign, empDesign));
  check("manager(Design) DENIED other-dept pii (Eng)", !(await canSee(cMgrDesign, empEng)));

  // Identity is all-member readable.
  const identCount = async (c: SupabaseClient) =>
    ((await c.from("employees").select("id").eq("company_id", companyId)).data ?? []).length;
  check("finance CAN read identity roster (all-member)", (await identCount(cFinance)) === 2);
  check("viewer CAN read identity roster (all-member)", (await identCount(cViewer)) === 2);

  console.log("\n=== ITEM 6: authorize() matrix (route gate logic) ===");
  const dec = (role: CompanyRole, cap: Parameters<typeof authorize>[1], resDept?: string | null) =>
    authorize({ plane: "tenant", role, departmentId: role === "manager" ? deptEng : null, approvalLimit: null }, cap, { resourceDepartmentId: resDept ?? undefined }).effect;
  check("view_pii: owner allow", dec("org_owner", "employees.view_pii") === "allow");
  check("view_pii: org_admin allow", dec("org_admin", "employees.view_pii") === "allow");
  check("view_pii: hr allow", dec("hr", "employees.view_pii") === "allow");
  check("view_pii: finance DENY", dec("finance", "employees.view_pii") === "deny");
  check("view_pii: viewer DENY", dec("viewer", "employees.view_pii") === "deny");
  check("view_pii: manager own-dept allow", dec("manager", "employees.view_pii", deptEng) === "allow");
  check("view_pii: manager other-dept DENY", dec("manager", "employees.view_pii", deptDesign) === "deny");
  check("edit: hr allow", dec("hr", "employees.edit") === "allow");
  check("edit: viewer DENY", dec("viewer", "employees.edit") === "deny");
  check("bulk_import: hr allow", dec("hr", "employees.bulk_import") === "allow");
  check("bulk_import: manager DENY", dec("manager", "employees.bulk_import") === "deny");
  check("bulk_import: viewer DENY", dec("viewer", "employees.bulk_import") === "deny");

  // ---- teardown (employee_pii cascades on employees delete, but delete explicitly) ----
  await admin.from("employee_pii").delete().eq("company_id", companyId);
  await admin.from("employees").delete().eq("company_id", companyId);
  await admin.from("company_members").delete().eq("company_id", companyId);
  await admin.from("departments").delete().eq("company_id", companyId);
  await admin.from("companies").delete().eq("id", companyId);
  for (const uid of [owner, adminU, hr, finance, viewer, mgrEng, mgrDesign]) {
    await admin.auth.admin.deleteUser(uid).catch(() => {});
  }

  // ---- residue proof ----
  const resCo = (await admin.from("companies").select("id", { count: "exact", head: true }).ilike("name", "t4a\\_%")).count ?? 0;
  const resPii = (await admin.from("employee_pii").select("employee_id", { count: "exact", head: true }).eq("company_id", companyId)).count ?? 0;
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const resUsers = (users?.users ?? []).filter((u) => u.email?.startsWith(`t4a_${runid}_`)).length;
  console.log("\n=== RESIDUE ===");
  check(`companies t4a_ = 0 (got ${resCo})`, resCo === 0);
  check(`employee_pii for co = 0 (got ${resPii})`, resPii === 0);
  check(`auth users t4a_${runid}_ = 0 (got ${resUsers})`, resUsers === 0);

  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});
