/**
 * Prompt 4a preview smoke — deployed foundation preview (bypass token + real JWT
 * SSR cookies). Proves route-layer PII strip/attach on the DEPLOYED handler, the
 * own-dept manager split, ciphertext-at-rest + decrypt, and no regression.
 * Synthetic PII only; key/secret values never printed. Run: npx tsx verify4a/_preview_smoke.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { decryptWithKey, parseEnvelope } from "../src/lib/services/pii-crypto-core";

const env = Object.fromEntries(
  readFileSync("c:/neonvisuals_v1/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
) as Record<string, string>;

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const BYP = env.VERCEL_AUTOMATION_BYPASS;
const APP = "https://neonvisuals-v1-iou9-git-foundation-vicky9833s-projects.vercel.app";
const REF = "xserhblhiwtmaiejbvgo";
const admin = createClient(URL_, SRK, { auth: { persistSession: false, autoRefreshToken: false } });
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const PW = `T4a!${runid}!pw`;

let pass = true;
const check = (label: string, cond: boolean, extra = "") => {
  if (!cond) pass = false;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`);
};

async function mkUser(tag: string): Promise<string> {
  const email = `t4a_${runid}_${tag}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
  if (error) throw new Error(`${tag}: ${error.message}`);
  return data.user.id;
}
async function grant(tag: string) {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: `t4a_${runid}_${tag}@example.com`, password: PW }),
  });
  return r.json();
}
function ck(s: any): string {
  const o = { access_token: s.access_token, token_type: "bearer", expires_in: s.expires_in, expires_at: s.expires_at, refresh_token: s.refresh_token, user: s.user };
  return `sb-${REF}-auth-token=base64-${Buffer.from(JSON.stringify(o), "utf8").toString("base64")}`;
}
const H = (cookie?: string | null) => ({ "x-vercel-protection-bypass": BYP, "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) });

async function main() {
  // ---- seed company/depts/users/members via admin ----
  const { data: co } = await admin.from("companies").insert({ name: `t4a_${runid}_co`, slug: `t4a-${runid}-co`, onboarding_completed: true }).select("id").single();
  const companyId = co!.id as string;
  const { data: depts } = await admin.from("departments").insert([
    { company_id: companyId, name: `t4a_${runid}_Engineering` },
    { company_id: companyId, name: `t4a_${runid}_Design` },
  ]).select("id, name");
  const deptEng = depts!.find((d) => d.name.endsWith("Engineering"))!.id as string;
  const deptDesign = depts!.find((d) => d.name.endsWith("Design"))!.id as string;

  const owner = await mkUser("owner"), hr = await mkUser("hr"), finance = await mkUser("finance"),
    viewer = await mkUser("viewer"), mgrEng = await mkUser("mgrEng"), mgrDesign = await mkUser("mgrDesign");
  await admin.from("company_members").insert([
    { company_id: companyId, user_id: owner, role: "org_owner", status: "active" },
    { company_id: companyId, user_id: hr, role: "hr", status: "active" },
    { company_id: companyId, user_id: finance, role: "finance", status: "active" },
    { company_id: companyId, user_id: viewer, role: "viewer", status: "active" },
    { company_id: companyId, user_id: mgrEng, role: "manager", status: "active", department_id: deptEng },
    { company_id: companyId, user_id: mgrDesign, role: "manager", status: "active", department_id: deptDesign },
  ]);

  const ckOwner = ck(await grant("owner")), ckHr = ck(await grant("hr")), ckFinance = ck(await grant("finance")),
    ckViewer = ck(await grant("viewer")), ckMgrEng = ck(await grant("mgrEng")), ckMgrDesign = ck(await grant("mgrDesign"));

  // ---- liveness: old code 500s on employees list (renamed PII cols); new code 200 ----
  console.log("=== LIVENESS (owner GET /api/employees -> 200 == b2992ca serving) ===");
  const deadline = Date.now() + 4 * 60 * 1000;
  let live = false;
  while (Date.now() < deadline) {
    const r = await fetch(`${APP}/api/employees`, { headers: H(ckOwner) });
    if (r.status === 200) { live = true; console.log(`  live: GET /api/employees -> 200`); break; }
    console.log(`  waiting... status ${r.status}`);
    await new Promise((x) => setTimeout(x, 12000));
  }
  check("preview serving new 4a code (employees list 200)", live);
  if (!live) { console.log("RESULT: FAIL (deploy not live)"); process.exit(1); }

  // ---- create employees via the DEPLOYED write path (encrypts into employee_pii) ----
  const phoneEng = `98765${runid.slice(-5)}`;
  const addrEng = `t4a ${runid}, Indiranagar`;
  console.log("\n=== CREATE via deployed POST /api/employees (owner) ===");
  const mkEmp = async (tag: string, deptId: string, phone: string, addr: string) => {
    const r = await fetch(`${APP}/api/employees`, {
      method: "POST", headers: H(ckOwner),
      body: JSON.stringify({ name: `t4a_${runid}_${tag}`, email: `t4a_${runid}_${tag}_emp@example.com`, phone, delivery_address: addr, city: "Bengaluru", pincode: "560038", dob_day: 12, dob_month: 6, department_id: deptId }),
    });
    const j = await r.json();
    return { status: r.status, data: j.data };
  };
  const eng = await mkEmp("EngPerson", deptEng, phoneEng, addrEng);
  const design = await mkEmp("DesignPerson", deptDesign, "9990001111", "design addr");
  check("owner create Eng employee -> 201", eng.status === 201);
  check("owner create Design employee -> 201", design.status === 201);
  const engId = eng.data?.id as string;
  const designId = design.data?.id as string;
  check("owner sees decrypted phone on create response", eng.data?.phone === phoneEng, `(match=${eng.data?.phone === phoneEng})`);

  // ---- item 3: ciphertext at rest + decrypts for authorized reader ----
  console.log("\n=== ITEM 3: ciphertext at rest (admin read employee_pii) ===");
  const { data: piiRow } = await admin.from("employee_pii").select("phone_enc, delivery_address_enc, city").eq("employee_id", engId).single();
  let isEnvelope = false;
  try { const p = parseEnvelope(piiRow!.phone_enc as string); isEnvelope = typeof p.v === "number" && !!p.iv && !!p.tag && !!p.ct; } catch { isEnvelope = false; }
  check("phone_enc is a ciphertext envelope at rest (not plaintext)", isEnvelope && (piiRow!.phone_enc as string) !== phoneEng);
  const { data: keyB64 } = await admin.rpc("get_pii_dek", { p_version: 1 });
  const key = Buffer.from(keyB64 as string, "base64");
  const decrypted = decryptWithKey(() => key, piiRow!.phone_enc as string);
  check("phone_enc decrypts to submitted plaintext", decrypted === phoneEng);
  check("city stored plaintext (RLS-gated, not encrypted)", piiRow!.city === "Bengaluru");

  // ---- item 1: PII strip/attach on deployed read route ----
  console.log("\n=== ITEM 1: deployed GET /api/employees/[id] PII strip vs attach ===");
  const getEmp = async (ckk: string, id: string) => {
    const r = await fetch(`${APP}/api/employees/${id}`, { headers: H(ckk) });
    return (await r.json()).data;
  };
  const stripped = (d: any) => d && d.phone == null && d.delivery_address == null && d.city == null && d.pincode == null && d.dob_day == null && d.dob_month == null && d.notes == null;
  const oOwner = await getEmp(ckOwner, engId);
  const oHr = await getEmp(ckHr, engId);
  const oFin = await getEmp(ckFinance, engId);
  const oView = await getEmp(ckViewer, engId);
  check("owner  -> PII present (phone decrypts)", oOwner?.phone === phoneEng);
  check("hr     -> PII present (phone decrypts + address)", oHr?.phone === phoneEng && oHr?.delivery_address === addrEng);
  check("finance-> PII STRIPPED (headline §10)", stripped(oFin), `(phone=${JSON.stringify(oFin?.phone)})`);
  check("viewer -> PII STRIPPED (headline §10)", stripped(oView), `(phone=${JSON.stringify(oView?.phone)})`);
  check("finance/viewer still see identity (name)", !!oFin?.name && !!oView?.name);

  // ---- item 2: own-dept manager split ----
  console.log("\n=== ITEM 2: own-dept manager split (deployed) ===");
  const mEngOnEng = await getEmp(ckMgrEng, engId);
  const mEngOnDesign = await getEmp(ckMgrEng, designId);
  check("manager(Eng) reading Eng employee -> PII present", mEngOnEng?.phone === phoneEng);
  check("manager(Eng) reading Design employee -> PII stripped", stripped(mEngOnDesign));

  // ---- item 4: view gone + no regression ----
  console.log("\n=== ITEM 4: employees_safe gone + public surface + team not regressed ===");
  const safe = await admin.from("employees_safe").select("id").limit(1);
  check("employees_safe relation is GONE", !!safe.error);
  const pub = async (m: string, p: string, body?: any) => {
    const r = await fetch(`${APP}${p}`, { method: m, redirect: "manual", headers: H(null), body: body ? JSON.stringify(body) : undefined });
    let mk = ""; try { const t = await r.text(); if (t.includes('"success":true')) mk = "{success}"; else if (t.includes("received")) mk = "{received}"; else if (t.includes("route not on allowlist")) mk = "403-body"; } catch {}
    return { status: r.status, loc: r.headers.get("location"), mk };
  };
  const home = await pub("GET", "/"); check("GET / -> 200", home.status === 200);
  const prod = await pub("GET", "/products"); check("GET /products -> 200", prod.status === 200);
  const login = await pub("GET", "/login"); check("GET /login -> 200", login.status === 200);
  const reg = await pub("GET", "/register"); check("GET /register -> 200", reg.status === 200);
  const dash = await pub("GET", "/dashboard"); check("GET /dashboard -> 307 /login?redirect=", dash.status === 307 && !!dash.loc?.includes("/login?redirect="));
  const nf = await pub("GET", "/nonexistent-xyz"); check("GET /nonexistent-xyz -> 403", nf.status === 403);
  const lead = await pub("POST", "/api/leads/capture", { name: `t4a ${runid}`, company: "QA", email: `t4a_${runid}_l@example.com`, source: "website", message: "4a" }); check("POST /api/leads/capture -> success", lead.status === 200);
  const contact = await pub("POST", "/api/contact", { name: `t4a ${runid}`, email: `t4a_${runid}_c@example.com`, company: "QA", message: "4a" }); check("POST /api/contact -> received", contact.status === 200);
  const team = await fetch(`${APP}/dashboard/team`, { headers: H(ckOwner), redirect: "manual" });
  const teamHtml = team.status === 200 ? await team.text() : "";
  check("/dashboard/team renders for owner (3b not regressed)", team.status === 200 && (teamHtml.includes("Make owner") || teamHtml.includes('aria-label="Role for')));

  // ---- teardown (owner member + company + users need MCP disable-trigger + cleanup_users) ----
  await admin.from("employee_pii").delete().eq("company_id", companyId);
  await admin.from("employees").delete().eq("company_id", companyId);
  await admin.from("leads").delete().or(`contact_email.ilike.t4a\\_${runid}\\_%,company_name.eq.QA`);
  console.log("\n(owner-member/company/user teardown via MCP disable-trigger + _cleanup_users)");

  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}

main().catch((err) => { console.error("FATAL", err); process.exit(1); });
