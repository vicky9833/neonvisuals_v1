/**
 * Prompt 4b preview smoke — deployed foundation preview (bypass token + real JWT
 * SSR cookies; SYNTHETIC PII only). Proves the §10 gates on the DEPLOYED /upload:
 * (1) PII-never-logged, (2) encryption-on-write, (3) Pro gate, (4) consent+offboard,
 * (5) no regression. Key value never printed. Run: npx tsx verify4b/_preview_smoke.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { decryptWithKey, parseEnvelope } from "../src/lib/services/pii-crypto-core";

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
const PW = `T4b!${runid}!pw`;
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };

async function mkUser(t: string) { const { data, error } = await admin.auth.admin.createUser({ email: `t4b_${runid}_${t}@example.com`, password: PW, email_confirm: true }); if (error) throw new Error(`${t}: ${error.message}`); return data.user.id; }
async function grant(t: string) { const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: `t4b_${runid}_${t}@example.com`, password: PW }) }); return r.json(); }
function ck(s: any) { const o = { access_token: s.access_token, token_type: "bearer", expires_in: s.expires_in, expires_at: s.expires_at, refresh_token: s.refresh_token, user: s.user }; return `sb-${REF}-auth-token=base64-${Buffer.from(JSON.stringify(o), "utf8").toString("base64")}`; }
const Hjson = (c?: string) => ({ "x-vercel-protection-bypass": BYP, "Content-Type": "application/json", ...(c ? { Cookie: c } : {}) });
const Hup = (c: string) => ({ "x-vercel-protection-bypass": BYP, Cookie: c }); // multipart: no Content-Type
async function upload(cookie: string, filename: string, csv: string) {
  const fd = new FormData();
  fd.append("file", new File([csv], filename, { type: filename.endsWith(".csv") ? "text/csv" : "application/octet-stream" }));
  const r = await fetch(`${APP}/api/employees/upload`, { method: "POST", headers: Hup(cookie), body: fd });
  const text = await r.text();
  let json: any = {}; try { json = JSON.parse(text); } catch {}
  return { status: r.status, text, json };
}

const S = { phone: "SENTINELPH0009998887", addr: "SENTINELADDR_SECRET_LANE_42", name: "SENTINELNAME_QORP", dob: "SENTINELDOB_31139999", email: "SENTINELMAIL_broken_at" };

async function main() {
  const { data: keyB64 } = await admin.rpc("get_pii_dek", { p_version: 1 });
  const key = Buffer.from(keyB64 as string, "base64");

  // Pro company + members; Free company + owner.
  const { data: proCo } = await admin.from("companies").insert({ name: `t4b_${runid}_pro`, slug: `t4b-${runid}-pro`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const proId = proCo!.id as string;
  const { data: freeCo } = await admin.from("companies").insert({ name: `t4b_${runid}_free`, slug: `t4b-${runid}-free`, onboarding_completed: true, plan: "free", employee_limit: 5 }).select("id").single();
  const freeId = freeCo!.id as string;
  const proOwner = await mkUser("proOwner"), proFin = await mkUser("proFin"), proView = await mkUser("proView"), freeOwner = await mkUser("freeOwner");
  await admin.from("company_members").insert([
    { company_id: proId, user_id: proOwner, role: "org_owner", status: "active" },
    { company_id: proId, user_id: proFin, role: "finance", status: "active" },
    { company_id: proId, user_id: proView, role: "viewer", status: "active" },
    { company_id: freeId, user_id: freeOwner, role: "org_owner", status: "active" },
  ]);
  const ckPro = ck(await grant("proOwner")), ckFin = ck(await grant("proFin")), ckView = ck(await grant("proView")), ckFree = ck(await grant("freeOwner"));

  // Liveness: /upload no longer 501 (unauth -> 401).
  console.log("=== LIVENESS (/upload flips 501 -> 401) ===");
  const deadline = Date.now() + 5 * 60 * 1000; let live = false;
  while (Date.now() < deadline) {
    const r = await fetch(`${APP}/api/employees/upload`, { method: "POST", headers: { "x-vercel-protection-bypass": BYP } });
    if (r.status !== 501 && r.status !== 404) { live = true; console.log(`  live: /upload -> ${r.status} (not 501)`); break; }
    console.log(`  waiting... ${r.status}`); await new Promise((x) => setTimeout(x, 12000));
  }
  check("preview serving 4b (/upload not 501)", live);
  if (!live) { console.log("RESULT: FAIL (deploy not live)"); process.exit(1); }

  // ITEM 1: PII-never-logged on deployed /upload (malformed CSV w/ sentinels).
  console.log("\n=== ITEM 1: PII-never-logged on DEPLOYED /upload (§10 gate) ===");
  const badCsv = [
    "name,email,phone,delivery_address,date_of_birth",
    `${S.name},${S.email},${S.phone},"${S.addr}",${S.dob}`,
    `${S.name}2,${S.email}2,${S.phone},"${S.addr}",13/13/2020`,
  ].join("\n");
  const up1 = await upload(ckPro, "bad.csv", badCsv);
  const { data: job1 } = await admin.from("import_jobs").select("errors_json, rows_total, rows_ok, rows_failed").eq("company_id", proId).order("created_at", { ascending: false }).limit(1).single();
  const surfaces = [up1.text, JSON.stringify(job1?.errors_json ?? [])];
  let hits = 0;
  for (const s of Object.values(S)) for (const h of surfaces) if (h.includes(s)) { hits++; console.log(`  LEAK: ${s}`); }
  check(`deployed response + import_jobs.errors_json: ZERO PII sentinels (hits=${hits})`, hits === 0);
  const errs = (up1.json?.data?.errors ?? up1.json?.errors ?? []) as any[];
  check("errors are by-reference (row/field/code)", errs.length > 0 && errs.every((e) => "row" in e && "field" in e && "code" in e));

  // ITEM 2: encryption-on-write via deployed /upload (valid CSV).
  console.log("\n=== ITEM 2: encryption-on-write via DEPLOYED /upload ===");
  const phones = [0, 1, 2].map((i) => `98${String(20000000 + i)}`);
  const addrs = [0, 1, 2].map((i) => `t4b ${runid} addr ${i}`);
  const goodCsv = ["name,email,phone,delivery_address,date_of_birth", ...[0, 1, 2].map((i) => `t4b_${runid}_g${i},t4b_${runid}_g${i}@ex.com,${phones[i]},"${addrs[i]}",15/08/1990`)].join("\n");
  const up2 = await upload(ckPro, "good.csv", goodCsv);
  check("valid upload accepted (rows_ok=3)", (up2.json?.data?.rows_ok ?? 0) === 3, JSON.stringify(up2.json?.data ?? up2.status));
  const { data: piiRows } = await admin.from("employee_pii").select("phone_enc, delivery_address_enc, employee_id, employees!inner(company_id, email)").eq("employees.company_id", proId);
  const gRows = (piiRows ?? []).filter((r: any) => (r.employees?.email ?? "").startsWith(`t4b_${runid}_g`));
  let envelopes = 0, decOk = 0, plaintext = 0;
  for (const r of gRows as any[]) {
    try { const pe = parseEnvelope(r.phone_enc); if (pe.v && pe.iv && pe.tag && pe.ct) envelopes++; } catch {}
    if (phones.includes(r.phone_enc) || addrs.includes(r.delivery_address_enc)) plaintext++;
    const dec = decryptWithKey(() => key, r.phone_enc);
    if (phones.includes(dec)) decOk++;
  }
  check("all 3 phone_enc are envelopes (ciphertext at rest)", envelopes === 3);
  check("ZERO plaintext at rest", plaintext === 0);
  check("all 3 decrypt to source for authorized reader", decOk === 3);

  // ITEM 3: Pro gate on deployed route.
  console.log("\n=== ITEM 3: Pro gate on DEPLOYED /upload + manual 5-cap ===");
  const upFree = await upload(ckFree, "good.csv", goodCsv);
  check("Free company /upload -> 403 plan_gate", upFree.status === 403 && upFree.json?.reason === "free_plan_import_blocked");
  // Manual add 5-cap on Free.
  let manualStatuses: number[] = [];
  for (let i = 0; i < 6; i++) {
    const r = await fetch(`${APP}/api/employees`, { method: "POST", headers: Hjson(ckFree), body: JSON.stringify({ name: `t4b_${runid}_m${i}`, email: `t4b_${runid}_m${i}@ex.com` }) });
    manualStatuses.push(r.status);
  }
  check("Free manual-add: first 5 -> 201, 6th -> 403 (soft cap)", manualStatuses.slice(0, 5).every((s) => s === 201) && manualStatuses[5] === 403, JSON.stringify(manualStatuses));

  // ITEM 4: consent + offboarding.
  console.log("\n=== ITEM 4: consent + offboarding (deployed) ===");
  const { data: consentRows } = await admin.from("employee_pii").select("consent_status, employees!inner(company_id, email)").eq("employees.company_id", proId);
  const gConsent = (consentRows ?? []).filter((r: any) => (r.employees?.email ?? "").startsWith(`t4b_${runid}_g`));
  check("imported rows consent_status = company_asserted", gConsent.length === 3 && gConsent.every((r: any) => r.consent_status === "company_asserted"));
  const badConsent = await admin.from("employee_pii").update({ consent_status: "nope" }).eq("employee_id", (gRows[0] as any).employee_id);
  check("CHECK rejects invalid consent_status", !!badConsent.error);
  // Offboard via deployed route (owner).
  const offId = (gRows[0] as any).employee_id;
  const offRes = await fetch(`${APP}/api/employees/${offId}/offboard`, { method: "POST", headers: Hjson(ckPro) });
  const offJson = await offRes.json().catch(() => ({}));
  const oa = offJson?.data?.offboarded_at ? new Date(offJson.data.offboarded_at) : null;
  const pa = offJson?.data?.purge_after ? new Date(offJson.data.purge_after) : null;
  const days = oa && pa ? Math.round((pa.getTime() - oa.getTime()) / 86_400_000) : -1;
  check("offboard -> 200 + purge_after = +90d", offRes.status === 200 && days === 90, `(days=${days})`);
  const listActive = await fetch(`${APP}/api/employees?isActive=true`, { headers: Hjson(ckPro) });
  const activeData = (await listActive.json())?.data?.employees ?? [];
  check("offboarded employee excluded from active roster", !activeData.some((e: any) => e.id === offId));

  // ITEM 5: no regression (§10 PII strip + public surface + team).
  console.log("\n=== ITEM 5: no regression ===");
  const getEmp = async (c: string, id: string) => (await (await fetch(`${APP}/api/employees/${id}`, { headers: Hjson(c) })).json()).data;
  const readId = (gRows[1] as any).employee_id;
  const asOwner = await getEmp(ckPro, readId), asFin = await getEmp(ckFin, readId), asView = await getEmp(ckView, readId);
  check("owner sees PII (phone decrypts)", asOwner?.phone === phones[1], `(match)`);
  check("finance PII stripped", asFin && asFin.phone == null && asFin.city == null);
  check("viewer PII stripped", asView && asView.phone == null);
  const pub = async (p: string) => (await fetch(`${APP}${p}`, { redirect: "manual", headers: { "x-vercel-protection-bypass": BYP } })).status;
  check("GET / -> 200", (await pub("/")) === 200);
  check("GET /dashboard -> 307", (await pub("/dashboard")) === 307);
  check("GET /nonexistent-xyz -> 403", (await pub("/nonexistent-xyz")) === 403);
  const team = await fetch(`${APP}/dashboard/team`, { headers: Hup(ckPro), redirect: "manual" });
  const teamHtml = team.status === 200 ? await team.text() : "";
  check("/dashboard/team renders for owner", team.status === 200 && (teamHtml.includes("Make owner") || teamHtml.includes('aria-label="Role for')));

  // teardown (employees cascade pii; owner members need MCP disable-trigger step after).
  await admin.from("employee_pii").delete().in("company_id", [proId, freeId]);
  await admin.from("employees").delete().in("company_id", [proId, freeId]);
  await admin.from("import_jobs").delete().in("company_id", [proId, freeId]);
  console.log("\n(owner-member/company/user teardown via MCP disable-trigger + _cleanup_users)");
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
