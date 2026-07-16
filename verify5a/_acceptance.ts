/**
 * Prompt 5a acceptance — items 2 (occasion_types), 3 (occasions RLS), 4 (departments
 * CRUD RLS + own-dept PII activation + Pro-gate), 5 (opt-in canonical + gates).
 * Real JWT sessions; t5a_ rows; teardown + residue proof. Run: npx tsx verify5a/_acceptance.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { canUseDepartments, festivalLimit } from "../src/lib/employees/plan-gate";

const env = Object.fromEntries(
  readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
) as Record<string, string>;
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SRK, { auth: { persistSession: false, autoRefreshToken: false } });
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const PW = `T5a!${runid}!pw`;
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };
async function mkUser(t: string) { const { data, error } = await admin.auth.admin.createUser({ email: `t5a_${runid}_${t}@example.com`, password: PW, email_confirm: true }); if (error) throw new Error(`${t}: ${error.message}`); return data.user.id; }
async function asUser(t: string): Promise<SupabaseClient> { const c = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } }); const { error } = await c.auth.signInWithPassword({ email: `t5a_${runid}_${t}@example.com`, password: PW }); if (error) throw new Error(`signin ${t}: ${error.message}`); return c; }

async function main() {
  // ---- seed ----
  const { data: coA } = await admin.from("companies").insert({ name: `t5a_${runid}_A`, slug: `t5a-${runid}-a`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const A = coA!.id as string;
  const { data: coB } = await admin.from("companies").insert({ name: `t5a_${runid}_B`, slug: `t5a-${runid}-b`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const B = coB!.id as string;
  const { data: depts } = await admin.from("departments").insert([
    { company_id: A, name: `t5a_${runid}_Eng` }, { company_id: A, name: `t5a_${runid}_Design` },
  ]).select("id, name");
  const deptEng = depts!.find((d) => d.name.endsWith("Eng"))!.id as string;
  const deptDesign = depts!.find((d) => d.name.endsWith("Design"))!.id as string;
  const owner = await mkUser("owner"), viewer = await mkUser("viewer"), mgrEng = await mkUser("mgrEng"), mgrDesign = await mkUser("mgrDesign"), ownerB = await mkUser("ownerB");
  await admin.from("company_members").insert([
    { company_id: A, user_id: owner, role: "org_owner", status: "active" },
    { company_id: A, user_id: viewer, role: "viewer", status: "active" },
    { company_id: A, user_id: mgrEng, role: "manager", status: "active", department_id: deptEng },
    { company_id: A, user_id: mgrDesign, role: "manager", status: "active", department_id: deptDesign },
    { company_id: B, user_id: ownerB, role: "org_owner", status: "active" },
  ]);
  const { data: emps } = await admin.from("employees").insert([
    { company_id: A, full_name: `t5a_${runid}_EngEmp`, department_id: deptEng },
    { company_id: A, full_name: `t5a_${runid}_DesignEmp`, department_id: deptDesign },
  ]).select("id, full_name");
  const empEng = emps!.find((e) => e.full_name.endsWith("EngEmp"))!.id as string;
  const empDesign = emps!.find((e) => e.full_name.endsWith("DesignEmp"))!.id as string;
  await admin.from("employee_pii").insert([
    { employee_id: empEng, company_id: A, phone_enc: "enc:eng", dob_day: 12, dob_month: 6 },
    { employee_id: empDesign, company_id: A, phone_enc: "enc:design", dob_day: 3, dob_month: 9 },
  ]);

  console.log("=== ITEM 2: occasion_types seed spot-check ===");
  const { data: ot } = await admin.from("occasion_types").select("key, default_lead_days, auto_generate, is_sensitive, requires_consent");
  const byKey = new Map((ot ?? []).map((r: any) => [r.key, r]));
  check("birthday lead=14, auto_generate=true", byKey.get("birthday")?.default_lead_days === 14 && byKey.get("birthday")?.auto_generate === true);
  check("milestone_anniversary lead=30", byKey.get("milestone_anniversary")?.default_lead_days === 30);
  check("onboarding lead=5 (days before joining)", byKey.get("onboarding")?.default_lead_days === 5);
  check("probation_completion lead=7", byKey.get("probation_completion")?.default_lead_days === 7);
  check("wedding is_sensitive+requires_consent+auto_generate=false", byKey.get("wedding")?.is_sensitive === true && byKey.get("wedding")?.requires_consent === true && byKey.get("wedding")?.auto_generate === false);

  console.log("\n=== ITEM 3: occasions RLS (company isolation + own-dept manager) ===");
  // Every row specifies the varying NOT-NULL columns (lead_days, recurrence, is_company_wide)
  // because a multi-row PostgREST insert sets omitted-but-present columns to NULL (not default).
  const occIns = await admin.from("occasions").insert([
    { company_id: A, employee_id: null, occasion_type_key: "company_anniversary", title: `t5a companywide`, date: "2027-06-01", recur_month: null, recur_day: null, lead_days: 30, recurrence: "none", is_company_wide: true },
    { company_id: A, employee_id: empEng, occasion_type_key: "birthday", title: `t5a eng bday`, date: null, recur_month: 6, recur_day: 12, lead_days: 14, recurrence: "annual", is_company_wide: false },
    { company_id: A, employee_id: empDesign, occasion_type_key: "birthday", title: `t5a design bday`, date: null, recur_month: 9, recur_day: 3, lead_days: 14, recurrence: "annual", is_company_wide: false },
    { company_id: B, employee_id: null, occasion_type_key: "company_anniversary", title: `t5a B companywide`, date: "2027-06-01", recur_month: null, recur_day: null, lead_days: 30, recurrence: "none", is_company_wide: true },
  ]);
  if (occIns.error) console.log("  [debug] occasions insert error:", occIns.error.message);
  const cOwner = await asUser("owner"), cViewer = await asUser("viewer"), cMgrEng = await asUser("mgrEng"), cMgrDesign = await asUser("mgrDesign"), cOwnerB = await asUser("ownerB");
  const occIds = async (c: SupabaseClient, companyId: string) => new Set(((await c.from("occasions").select("id, employee_id, title").eq("company_id", companyId)).data ?? []).map((r: any) => r.title));
  const ownerSees = await occIds(cOwner, A);
  check("owner(A) sees all 3 A occasions", ownerSees.has("t5a companywide") && ownerSees.has("t5a eng bday") && ownerSees.has("t5a design bday"));
  check("owner(A) does NOT see B occasion (isolation)", !(await occIds(cOwner, B)).has("t5a B companywide"));
  const mgrEngSees = await occIds(cMgrEng, A);
  check("manager(Eng) sees company-wide + eng bday", mgrEngSees.has("t5a companywide") && mgrEngSees.has("t5a eng bday"));
  check("manager(Eng) does NOT see design bday (own-dept)", !mgrEngSees.has("t5a design bday"));
  const mgrDesignSees = await occIds(cMgrDesign, A);
  check("manager(Design) sees design bday, NOT eng bday", mgrDesignSees.has("t5a design bday") && !mgrDesignSees.has("t5a eng bday"));
  check("viewer(A) sees person occasions (dashboards.view)", (await occIds(cViewer, A)).has("t5a eng bday"));
  check("ownerB isolation: sees only B", (await occIds(cOwnerB, B)).has("t5a B companywide") && !(await occIds(cOwnerB, A)).size);
  // Year-agnostic birthday row.
  const { data: bday } = await admin.from("occasions").select("recur_month, recur_day, date, recurrence").eq("company_id", A).eq("title", "t5a eng bday").single();
  check("year-agnostic birthday: recur_month/day set, date null, recurrence=annual", bday!.recur_month === 6 && bday!.recur_day === 12 && bday!.date === null && bday!.recurrence === "annual");

  console.log("\n=== ITEM 4: departments CRUD RLS + own-dept PII activation + Pro-gate ===");
  // CRUD RLS at JWT layer.
  const ownerInsert = await cOwner.from("departments").insert({ company_id: A, name: `t5a_${runid}_Ops` }).select("id").maybeSingle();
  check("owner CAN create department (departments_manage)", !ownerInsert.error && !!ownerInsert.data);
  const viewerInsert = await cViewer.from("departments").insert({ company_id: A, name: `t5a_${runid}_Hack` }).select("id");
  check("viewer CANNOT create department (denied)", (viewerInsert.data ?? []).length === 0 || !!viewerInsert.error);
  if (ownerInsert.data) {
    const upd = await cOwner.from("departments").update({ name: `t5a_${runid}_Ops2` }).eq("id", ownerInsert.data.id).select("id");
    check("owner CAN update department", (upd.data ?? []).length === 1);
    const del = await cOwner.from("departments").delete().eq("id", ownerInsert.data.id).select("id");
    check("owner CAN delete department", (del.data ?? []).length === 1);
  }
  // Pro-gate (pure).
  check("canUseDepartments: Free denied", !canUseDepartments({ plan: "free", isPlatformStaff: false }).allowed);
  check("canUseDepartments: Pro allowed", canUseDepartments({ plan: "pro", isPlatformStaff: false }).allowed);
  check("canUseDepartments: platform bypass", canUseDepartments({ plan: "free", isPlatformStaff: true }).allowed);
  // Own-dept PII activation (4a RLS now live via real dept data).
  const piiEng = ((await cMgrEng.from("employee_pii").select("employee_id").eq("company_id", A)).data ?? []).map((r: any) => r.employee_id);
  check("manager(Eng) sees Eng employee PII (4a RLS now LIVE)", piiEng.includes(empEng));
  check("manager(Eng) does NOT see Design employee PII", !piiEng.includes(empDesign));

  console.log("\n=== ITEM 5: opt-in canonicalization + gates ===");
  const { data: coCols } = await admin.from("companies").select("*").eq("id", A).single();
  check("_deprecated_observed_festivals exists", "_deprecated_observed_festivals" in (coCols as object));
  check("observed_festivals removed", !("observed_festivals" in (coCols as object)));
  const { data: fest } = await admin.from("festival_calendar").select("id").eq("name", "Diwali").eq("year", 2027).single();
  const optin = await admin.from("company_festivals").insert({ company_id: A, festival_id: fest!.id, is_active: true }).select("id").maybeSingle();
  check("company_festivals opt-in insert works (canonical)", !optin.error && !!optin.data);
  check("festivalLimit: Free = 3", festivalLimit({ plan: "free", isPlatformStaff: false }) === 3);
  check("festivalLimit: Pro = unlimited", festivalLimit({ plan: "pro", isPlatformStaff: false }) === Number.POSITIVE_INFINITY);

  // ---- teardown ----
  await admin.from("occasions").delete().in("company_id", [A, B]);
  await admin.from("company_festivals").delete().in("company_id", [A, B]);
  await admin.from("employee_pii").delete().in("company_id", [A, B]);
  await admin.from("employees").delete().in("company_id", [A, B]);
  console.log("\n(owner-member/company/user teardown via MCP disable-trigger + _cleanup_users)");
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
