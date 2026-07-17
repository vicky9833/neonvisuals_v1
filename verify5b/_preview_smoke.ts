/**
 * Prompt 5b PREVIEW SMOKE — deployed foundation preview (bypass token + real JWT cookies).
 * Liveness/cutover signal: 5b adds NO new route; the deployed /dashboard server component now
 * calls generateOccasions(companyId) on load, so rendering /dashboard as a test-company owner
 * runs the DEPLOYED engine per-company (no global cron side effects). We poll until occasions
 * with notify_date appear for a FRESH test company (5a dashboard did NOT write them).
 *
 * Proves on deployed code:
 *  (1) cutover — occasions written w/ notify_date; reminders derived from occasions (downstream)
 *  (2) milestone suppression — 10-yr -> milestone only; 3-yr -> plain anniversary
 *  (3) onboarding notify = join-5; null-joining -> birthday only
 *  (4) blackout ORG + PLATFORM skip (notify pushed earlier) + rush state
 *  (5) festival Free=3 cap (3 ok, 4th 403); Pro unlimited
 *  (6) no regression — §10 PII strip, own-dept PII, public surface, /dashboard/team
 * Run: npx tsx verify5b/_preview_smoke.ts
 */
import { createClient } from "@supabase/supabase-js";
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
const PW = `T5b!${runid}!pw`;
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (base: string, n: number) => { const d = new Date(base); d.setDate(d.getDate() + n); return iso(d); };
async function mkUser(t: string) { const { data, error } = await admin.auth.admin.createUser({ email: `t5b_${runid}_${t}@example.com`, password: PW, email_confirm: true }); if (error) throw new Error(`${t}: ${error.message}`); return data.user.id; }
async function grant(t: string) { const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: `t5b_${runid}_${t}@example.com`, password: PW }) }); return r.json(); }
function ck(s: any) { const o = { access_token: s.access_token, token_type: "bearer", expires_in: s.expires_in, expires_at: s.expires_at, refresh_token: s.refresh_token, user: s.user }; return `sb-${REF}-auth-token=base64-${Buffer.from(JSON.stringify(o), "utf8").toString("base64")}`; }
const H = (c?: string) => ({ "x-vercel-protection-bypass": BYP, "Content-Type": "application/json", ...(c ? { Cookie: c } : {}) });
async function jget(path: string, c?: string) { const r = await fetch(`${APP}${path}`, { headers: H(c), redirect: "manual" }); const t = await r.text(); let j: any = {}; try { j = JSON.parse(t); } catch {} return { status: r.status, j, t }; }
async function jpost(path: string, c: string, body: any, method = "POST") { const r = await fetch(`${APP}${path}`, { method, headers: H(c), body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); return { status: r.status, j }; }
async function render(path: string, c: string) { const r = await fetch(`${APP}${path}`, { headers: H(c), redirect: "manual" }); return r.status; }

async function main() {
  const today = iso(new Date(new Date().setHours(0, 0, 0, 0)));
  const contact = `t5b_${runid}_contact@example.com`;

  // ---- seed companies + users + members ----
  const { data: proCo } = await admin.from("companies").insert({ name: `t5b_${runid}_pro`, slug: `t5b-${runid}-pro`, onboarding_completed: true, plan: "pro", primary_contact_email: contact }).select("id").single();
  const proId = proCo!.id as string;
  const { data: freeCo } = await admin.from("companies").insert({ name: `t5b_${runid}_free`, slug: `t5b-${runid}-free`, onboarding_completed: true, plan: "free" }).select("id").single();
  const freeId = freeCo!.id as string;
  const owner = await mkUser("owner"), fin = await mkUser("fin"), mgr = await mkUser("mgr"), view = await mkUser("view"), freeOwner = await mkUser("freeOwner");
  await admin.from("company_members").insert([
    { company_id: proId, user_id: owner, role: "org_owner", status: "active" },
    { company_id: proId, user_id: fin, role: "finance", status: "active" },
    { company_id: proId, user_id: mgr, role: "manager", status: "active" },
    { company_id: proId, user_id: view, role: "viewer", status: "active" },
    { company_id: freeId, user_id: freeOwner, role: "org_owner", status: "active" },
  ]);
  // getProfile() (dashboard server component) reads profiles.company_id. A signup TRIGGER
  // auto-creates a profiles row per auth user with company_id=null — so we UPDATE (not insert)
  // to link each test user to its company, mirroring the app's onboarding link step.
  for (const [uid, cid] of [[owner, proId], [fin, proId], [mgr, proId], [freeOwner, freeId]] as const) {
    await admin.from("profiles").update({ company_id: cid, is_onboarded: true }).eq("id", uid);
  }
  const ckOwner = ck(await grant("owner")), ckFin = ck(await grant("fin")), ckMgr = ck(await grant("mgr")), ckFree = ck(await grant("freeOwner"));

  // ---- occasion fixtures (admin-insert; engine reads employees + employee_pii) ----
  const annivMMDD = addDays(today, 30);   // upcoming anniversary this year
  const y = new Date(today).getFullYear();
  const join10 = `${y - 10}-${annivMMDD.slice(5)}`;  // 10-yr milestone
  const join3 = `${y - 3}-${annivMMDD.slice(5)}`;    // 3-yr plain
  const joinFuture = addDays(today, 20);             // future joiner -> onboarding
  const bdaySoon = new Date(addDays(today, 5));      // birthday ~5 days -> within7 + rush
  const bdayFar = new Date(addDays(today, 40));      // birthday 40 days -> blackout window test
  const { data: emps } = await admin.from("employees").insert([
    { company_id: proId, full_name: `t5b_${runid}_Ten`, joining_date: join10 },
    { company_id: proId, full_name: `t5b_${runid}_Three`, joining_date: join3 },
    { company_id: proId, full_name: `t5b_${runid}_Future`, joining_date: joinFuture },
    { company_id: proId, full_name: `t5b_${runid}_NoJoin`, joining_date: null },
    { company_id: proId, full_name: `t5b_${runid}_Blackout`, joining_date: null },
  ]).select("id, full_name");
  const id = (s: string) => emps!.find((e) => e.full_name.endsWith(s))!.id as string;
  const ten = id("Ten"), three = id("Three"), future = id("Future"), nojoin = id("NoJoin"), blk = id("Blackout");
  await admin.from("employee_pii").insert([
    { employee_id: nojoin, company_id: proId, phone_enc: "enc", dob_day: bdaySoon.getDate(), dob_month: bdaySoon.getMonth() + 1 },
    { employee_id: blk, company_id: proId, phone_enc: "enc", dob_day: bdayFar.getDate(), dob_month: bdayFar.getMonth() + 1 },
  ]);
  const occFar = addDays(today, 40); // Blackout employee's birthday occurrence date

  // ---- blackout: ORG (companies.blackout_dates) + PLATFORM (platform_blackout_dates) ----
  // Window of Blackout birthday (lead 14). Place ORG at occ-2,occ-3 and PLATFORM at occ-5,-6,-7.
  // computeNotify skips all 5 -> notify = occ-19 (14 non-blackout days back).
  const orgBl = [addDays(occFar, -2), addDays(occFar, -3)];
  const platBl = [addDays(occFar, -5), addDays(occFar, -6), addDays(occFar, -7)];
  await admin.from("companies").update({ blackout_dates: orgBl }).eq("id", proId);
  await admin.from("platform_blackout_dates").insert(platBl.map((d) => ({ date: d, kind: "production", note: `t5b_${runid}` })));
  const expectNotifyBlk = addDays(occFar, -19);

  // ---- deployed dept own-dept + PII-strip regression employee (real encrypted phone) ----
  const dEng = await jpost("/api/departments", ckOwner, { name: `t5b_${runid}_Eng` });
  const deptEng = dEng.j?.data?.id as string;
  await jpost(`/api/departments/${deptEng}`, ckOwner, { manager_id: mgr }, "PATCH");
  const phoneReg = "9876500011";
  const empReg = await jpost("/api/employees", ckOwner, { name: `t5b_${runid}_RegEmp`, email: `t5b_${runid}_reg@ex.com`, phone: phoneReg, department_id: deptEng });
  const regId = empReg.j?.data?.id as string;

  // ================= LIVENESS: poll deployed /dashboard until it writes occasions =================
  console.log("=== LIVENESS (deployed /dashboard writes occasions w/ notify_date) ===");
  const deadline = Date.now() + 6 * 60 * 1000; let live = false;
  while (Date.now() < deadline) {
    const st = await render("/dashboard", ckOwner);
    const { count } = await admin.from("occasions").select("id", { count: "exact", head: true }).eq("company_id", proId).eq("auto_generated", true).not("notify_date", "is", null);
    if (st === 200 && (count ?? 0) > 0) { live = true; console.log(`  live: /dashboard 200, auto occasions w/ notify_date = ${count}`); break; }
    console.log(`  waiting... dashboard=${st} occasions=${count ?? 0}`); await new Promise((x) => setTimeout(x, 12000));
  }
  check("preview serving 5b (deployed dashboard generated occasions)", live);
  if (!live) { console.log("RESULT: FAIL (deploy not live)"); process.exit(1); }
  // second render -> email dedupe + regen (idempotent) + reminders debounce
  await render("/dashboard", ckOwner);

  const { data: occ } = await admin.from("occasions").select("employee_id, occasion_type_key, date, notify_date, lead_days, is_rush").eq("company_id", proId);
  const rowsFor = (e: string) => (occ ?? []).filter((o: any) => o.employee_id === e);

  console.log("\n=== ITEM 1: cutover — reminders derived from occasions (downstream consumer) ===");
  const { data: rems } = await admin.from("reminders").select("reminder_date, occasion_date, reminder_type, employee_id").eq("company_id", proId);
  const notifySet = new Set((occ ?? []).map((o: any) => o.notify_date));
  const allRemFromOcc = (rems ?? []).length > 0 && (rems ?? []).every((r: any) => notifySet.has(r.reminder_date));
  check("reminders exist and every reminder_date == an occasion.notify_date", allRemFromOcc, `(reminders=${(rems ?? []).length})`);
  check("every occasion carries lead_days + notify_date", (occ ?? []).length > 0 && (occ ?? []).every((o: any) => typeof o.lead_days === "number" && !!o.notify_date));

  console.log("\n=== ITEM 2: milestone suppression (deployed) ===");
  const tenTypes = rowsFor(ten).map((o: any) => o.occasion_type_key);
  const threeTypes = rowsFor(three).map((o: any) => o.occasion_type_key);
  check("10-yr: milestone_anniversary present, work_anniversary SUPPRESSED", tenTypes.includes("milestone_anniversary") && !tenTypes.includes("work_anniversary"), JSON.stringify(tenTypes));
  check("3-yr: work_anniversary present, NO milestone", threeTypes.includes("work_anniversary") && !threeTypes.includes("milestone_anniversary"), JSON.stringify(threeTypes));

  console.log("\n=== ITEM 3: onboarding sign + null-joining ===");
  const onb = rowsFor(future).find((o: any) => o.occasion_type_key === "onboarding");
  check("onboarding notify = joining_date - 5 (BEFORE joining)", onb?.notify_date === addDays(joinFuture, -5) && (onb?.notify_date as string) < joinFuture, `(notify=${onb?.notify_date}, join=${joinFuture})`);
  const nojTypes = rowsFor(nojoin).map((o: any) => o.occasion_type_key);
  check("null-joining employee -> birthday ONLY", nojTypes.length === 1 && nojTypes[0] === "birthday", JSON.stringify(nojTypes));

  console.log("\n=== ITEM 4: blackout ORG + PLATFORM skip + rush ===");
  const blkBday = rowsFor(blk).find((o: any) => o.occasion_type_key === "birthday");
  check("blackout ORG+PLATFORM skipped -> notify pushed to occ-19", blkBday?.notify_date === expectNotifyBlk, `(notify=${blkBday?.notify_date}, expect=${expectNotifyBlk})`);
  const nojBday = rowsFor(nojoin).find((o: any) => o.occasion_type_key === "birthday");
  check("near birthday (~5 days, lead 14) -> is_rush=true", nojBday?.is_rush === true);
  check("future onboarding (~15 days out) -> is_rush=false (normal)", onb?.is_rush === false);
  // clean up global platform blackout immediately after measuring
  await admin.from("platform_blackout_dates").delete().eq("note", `t5b_${runid}`);

  console.log("\n=== ITEM 4b: dashboard occasion-reminder email fired ONCE (no double-fire) ===");
  const { data: elog } = await admin.from("email_log").select("id, status").eq("to_email", contact).eq("template", "occasion_reminder");
  check("occasion_reminder to contact logged exactly once across 2 renders", (elog ?? []).length === 1, `(rows=${(elog ?? []).length})`);

  console.log("\n=== ITEM 5: festival Free=3 cap; Pro unlimited ===");
  const { data: festRows } = await admin.from("festival_calendar").select("id").limit(5);
  const fids = (festRows ?? []).map((f: any) => f.id as string);
  const three3 = await jpost("/api/occasions/festivals", ckFree, { preferences: fids.slice(0, 3).map((festival_id) => ({ festival_id, is_active: true })) });
  check("Free opt-in 3 festivals -> 200", three3.status === 200, JSON.stringify(three3.j).slice(0, 80));
  const four = await jpost("/api/occasions/festivals", ckFree, { preferences: [{ festival_id: fids[3], is_active: true }] });
  check("Free opt-in 4th festival -> 403 free_festival_limit", four.status === 403 && four.j?.reason === "free_festival_limit", JSON.stringify(four.j).slice(0, 80));
  const proFour = await jpost("/api/occasions/festivals", ckOwner, { preferences: fids.slice(0, 4).map((festival_id) => ({ festival_id, is_active: true })) });
  check("Pro opt-in 4 festivals -> 200 (unlimited)", proFour.status === 200, JSON.stringify(proFour.j).slice(0, 80));

  console.log("\n=== ITEM 6: no regression ===");
  const finRead = await jget(`/api/employees/${regId}`, ckFin);
  check("finance PII stripped (§10)", finRead.j?.data && finRead.j.data.phone == null);
  const ownerRead = await jget(`/api/employees/${regId}`, ckOwner);
  check("owner sees PII", ownerRead.j?.data?.phone === phoneReg, `(phone match=${ownerRead.j?.data?.phone === phoneReg})`);
  const mgrRead = await jget(`/api/employees/${regId}`, ckMgr);
  check("manager reads own-dept PII (4a activation intact)", mgrRead.j?.data?.phone === phoneReg);
  const pub = async (p: string) => (await fetch(`${APP}${p}`, { redirect: "manual", headers: { "x-vercel-protection-bypass": BYP } })).status;
  check("GET / -> 200", (await pub("/")) === 200);
  check("GET /dashboard -> 307", (await pub("/dashboard")) === 307);
  check("GET /nonexistent-xyz -> 403", (await pub("/nonexistent-xyz")) === 403);
  const team = await fetch(`${APP}/dashboard/team`, { headers: { "x-vercel-protection-bypass": BYP, Cookie: ckOwner }, redirect: "manual" });
  check("/dashboard/team renders for owner (3b intact)", team.status === 200);

  // ================= teardown =================
  await admin.from("reminders").delete().in("company_id", [proId, freeId]);
  await admin.from("occasions").delete().in("company_id", [proId, freeId]);
  await admin.from("company_festivals").delete().in("company_id", [proId, freeId]);
  await admin.from("employee_pii").delete().in("company_id", [proId, freeId]);
  await admin.from("employees").delete().in("company_id", [proId, freeId]);
  await admin.from("departments").delete().eq("company_id", proId);
  await admin.from("email_log").delete().eq("to_email", contact);
  await admin.from("platform_blackout_dates").delete().eq("note", `t5b_${runid}`);
  await admin.from("profiles").delete().like("email", `t5b_${runid}_%`);
  // non-owner members deletable; org_owner members blocked by 3b guard -> MCP step + _cleanup_users.
  await admin.from("company_members").delete().in("company_id", [proId, freeId]).neq("role", "org_owner");
  const platResid = (await admin.from("platform_blackout_dates").select("id", { count: "exact", head: true }).eq("note", `t5b_${runid}`)).count ?? 0;
  check(`platform_blackout_dates t5b_ residue = 0 (got ${platResid})`, platResid === 0);
  console.log("\n(owner-member/company/user teardown via MCP disable-trigger + verify5b/_cleanup_users.mjs)");

  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
