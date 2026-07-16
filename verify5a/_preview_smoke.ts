/**
 * Prompt 5a preview smoke — deployed foundation preview (bypass token + real JWT cookies).
 * Proves: (1) PostgREST cache reloaded (new tables resolve via API), (2) departments -> own-dept
 * PII activation deployed, (3) Diwali 2027 seed visible, (4) occasion_types read-only for tenants,
 * (5) no regression. Run: npx tsx verify5a/_preview_smoke.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
) as Record<string, string>;
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SRK = env.SUPABASE_SERVICE_ROLE_KEY, BYP = env.VERCEL_AUTOMATION_BYPASS;
const APP = "https://neonvisuals-v1-iou9-git-foundation-vicky9833s-projects.vercel.app";
const REF = "xserhblhiwtmaiejbvgo";
const admin = createClient(URL_, SRK, { auth: { persistSession: false, autoRefreshToken: false } });
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const PW = `T5a!${runid}!pw`;
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };
async function mkUser(t: string) { const { data, error } = await admin.auth.admin.createUser({ email: `t5a_${runid}_${t}@example.com`, password: PW, email_confirm: true }); if (error) throw new Error(`${t}: ${error.message}`); return data.user.id; }
async function grant(t: string) { const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: `t5a_${runid}_${t}@example.com`, password: PW }) }); return r.json(); }
function ck(s: any) { const o = { access_token: s.access_token, token_type: "bearer", expires_in: s.expires_in, expires_at: s.expires_at, refresh_token: s.refresh_token, user: s.user }; return `sb-${REF}-auth-token=base64-${Buffer.from(JSON.stringify(o), "utf8").toString("base64")}`; }
const H = (c?: string) => ({ "x-vercel-protection-bypass": BYP, "Content-Type": "application/json", ...(c ? { Cookie: c } : {}) });
async function jget(path: string, c?: string) { const r = await fetch(`${APP}${path}`, { headers: H(c), redirect: "manual" }); const t = await r.text(); let j: any = {}; try { j = JSON.parse(t); } catch {} return { status: r.status, j, t }; }
async function jpost(path: string, c: string, body: any, method = "POST") { const r = await fetch(`${APP}${path}`, { method, headers: H(c), body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); return { status: r.status, j }; }

async function main() {
  // Seed: Pro company + members; Free company + owner.
  const { data: proCo } = await admin.from("companies").insert({ name: `t5a_${runid}_pro`, slug: `t5a-${runid}-pro`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const proId = proCo!.id as string;
  const { data: freeCo } = await admin.from("companies").insert({ name: `t5a_${runid}_free`, slug: `t5a-${runid}-free`, onboarding_completed: true, plan: "free" }).select("id").single();
  const freeId = freeCo!.id as string;
  const owner = await mkUser("owner"), fin = await mkUser("fin"), view = await mkUser("view"), mgr = await mkUser("mgr"), freeOwner = await mkUser("freeOwner");
  await admin.from("company_members").insert([
    { company_id: proId, user_id: owner, role: "org_owner", status: "active" },
    { company_id: proId, user_id: fin, role: "finance", status: "active" },
    { company_id: proId, user_id: view, role: "viewer", status: "active" },
    { company_id: proId, user_id: mgr, role: "manager", status: "active" },
    { company_id: freeId, user_id: freeOwner, role: "org_owner", status: "active" },
  ]);
  const ckOwner = ck(await grant("owner")), ckFin = ck(await grant("fin")), ckView = ck(await grant("view")), ckMgr = ck(await grant("mgr")), ckFree = ck(await grant("freeOwner"));

  console.log("=== LIVENESS (/api/departments flips 404 -> 401) ===");
  const deadline = Date.now() + 5 * 60 * 1000; let live = false;
  while (Date.now() < deadline) {
    const r = await fetch(`${APP}/api/departments`, { headers: { "x-vercel-protection-bypass": BYP } });
    if (r.status !== 404) { live = true; console.log(`  live: /api/departments -> ${r.status} (not 404)`); break; }
    console.log("  waiting... 404"); await new Promise((x) => setTimeout(x, 12000));
  }
  check("preview serving 5a (/api/departments not 404)", live);
  if (!live) { console.log("RESULT: FAIL (deploy not live)"); process.exit(1); }

  console.log("\n=== ITEM 1: PostgREST cache reloaded (new tables resolve via REST API) ===");
  for (const tbl of ["occasion_types", "occasions", "departments"]) {
    const r = await admin.from(tbl).select("*", { count: "exact", head: true });
    const notInCache = r.error?.message?.includes("schema cache") || (r.error as any)?.code === "PGRST205";
    check(`${tbl} resolves through REST API (no PGRST205)`, !notInCache, r.error ? `err=${r.error.message}` : "");
  }
  const depGet = await jget("/api/departments", ckOwner);
  check("deployed GET /api/departments (owner) -> 200 (route + cache)", depGet.status === 200);

  console.log("\n=== ITEM 2: departments -> own-dept PII activation (deployed) ===");
  // Owner creates two depts.
  const dEng = await jpost("/api/departments", ckOwner, { name: `t5a_${runid}_Eng` });
  const dDes = await jpost("/api/departments", ckOwner, { name: `t5a_${runid}_Design` });
  check("owner create dept (Eng) -> 201", dEng.status === 201, JSON.stringify(dEng.j).slice(0, 80));
  const deptEng = dEng.j?.data?.id as string, deptDesign = dDes.j?.data?.id as string;
  // Assign manager to Eng (sets company_members.department_id for mgr).
  const assign = await jpost(`/api/departments/${deptEng}`, ckOwner, { manager_id: mgr }, "PATCH");
  check("owner assign manager to Eng -> 200", assign.status === 200);
  // Create employees in each dept via deployed POST (encrypts PII).
  const phoneEng = `98${String(30000000 + 1)}`;
  const empEng = await jpost("/api/employees", ckOwner, { name: `t5a_${runid}_EngEmp`, email: `t5a_${runid}_eng@ex.com`, phone: phoneEng, department_id: deptEng });
  const empDes = await jpost("/api/employees", ckOwner, { name: `t5a_${runid}_DesEmp`, email: `t5a_${runid}_des@ex.com`, phone: "9990001111", department_id: deptDesign });
  check("owner create Eng+Design employees -> 201", empEng.status === 201 && empDes.status === 201);
  const engEmpId = empEng.j?.data?.id as string, desEmpId = empDes.j?.data?.id as string;
  // Manager(Eng) reads own-dept PII, denied other-dept.
  const mgrEng = await jget(`/api/employees/${engEmpId}`, ckMgr);
  const mgrDes = await jget(`/api/employees/${desEmpId}`, ckMgr);
  check("manager reads Eng employee PII (own-dept, 4a RLS live deployed)", mgrEng.j?.data?.phone === phoneEng, `(phone match=${mgrEng.j?.data?.phone === phoneEng})`);
  check("manager DENIED Design employee PII (stripped)", mgrDes.j?.data && mgrDes.j.data.phone == null);
  // Pro gate + non-owner denied.
  const freeDept = await jpost("/api/departments", ckFree, { name: `t5a_${runid}_FreeDept` });
  check("Free company departments -> 403 plan_gate", freeDept.status === 403 && freeDept.j?.reason === "free_departments_blocked");
  const viewerDept = await jpost("/api/departments", ckView, { name: `t5a_${runid}_ViewDept` });
  check("viewer create dept -> 403 (not owner/admin)", viewerDept.status === 403);

  console.log("\n=== ITEM 3: festival seed visible (Diwali 2027) ===");
  const { data: diwali } = await admin.from("festival_calendar").select("date, default_lead_days, date_confidence").eq("name", "Diwali").eq("year", 2027).single();
  check("Diwali 2027 = 2027-10-29, lead 45, date_confidence=verified", diwali?.date === "2027-10-29" && diwali?.default_lead_days === 45 && diwali?.date_confidence === "verified");
  // Readable via a member JWT (festival_calendar is shared config).
  const cOwner = createClient(URL_, ANON, { auth: { persistSession: false } }); await cOwner.auth.signInWithPassword({ email: `t5a_${runid}_owner@example.com`, password: PW });
  const festRead = await cOwner.from("festival_calendar").select("name").eq("year", 2027);
  check("festival calendar readable by member (Free/Pro see it; cap is 5b)", (festRead.data ?? []).length >= 10 && !festRead.error);

  console.log("\n=== ITEM 4: occasion_types readable by tenant, NOT writable ===");
  const otRead = await cOwner.from("occasion_types").select("key").limit(1);
  check("occasion_types readable by tenant member", (otRead.data ?? []).length === 1 && !otRead.error);
  const otWrite = await cOwner.from("occasion_types").update({ default_lead_days: 999 }).eq("key", "birthday").select("key");
  check("occasion_types NOT writable by tenant (config)", (otWrite.data ?? []).length === 0);

  console.log("\n=== ITEM 5: no regression ===");
  const finRead = await jget(`/api/employees/${engEmpId}`, ckFin);
  check("finance PII stripped (§10 no regression)", finRead.j?.data && finRead.j.data.phone == null);
  const ownerRead = await jget(`/api/employees/${engEmpId}`, ckOwner);
  check("owner sees PII", ownerRead.j?.data?.phone === phoneEng);
  const pub = async (p: string) => (await fetch(`${APP}${p}`, { redirect: "manual", headers: { "x-vercel-protection-bypass": BYP } })).status;
  check("GET / -> 200", (await pub("/")) === 200);
  check("GET /dashboard -> 307", (await pub("/dashboard")) === 307);
  check("GET /nonexistent-xyz -> 403", (await pub("/nonexistent-xyz")) === 403);
  const team = await fetch(`${APP}/dashboard/team`, { headers: { "x-vercel-protection-bypass": BYP, Cookie: ckOwner }, redirect: "manual" });
  check("/dashboard/team renders for owner (3b intact)", team.status === 200);

  // teardown: employees/pii/occasions/company_festivals + non-owner; owner-member/company/user via MCP.
  await admin.from("occasions").delete().in("company_id", [proId, freeId]);
  await admin.from("company_festivals").delete().in("company_id", [proId, freeId]);
  await admin.from("employee_pii").delete().in("company_id", [proId, freeId]);
  await admin.from("employees").delete().in("company_id", [proId, freeId]);
  console.log("\n(owner-member/company/user teardown via MCP disable-trigger + _cleanup_users)");
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
