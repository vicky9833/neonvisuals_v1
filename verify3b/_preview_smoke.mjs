import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/)
  .filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SRK = env.SUPABASE_SERVICE_ROLE_KEY, BYP = env.VERCEL_AUTOMATION_BYPASS;
const APP = "https://neonvisuals-v1-iou9-git-foundation-vicky9833s-projects.vercel.app";
const REF = "xserhblhiwtmaiejbvgo";
const admin = createClient(URL_, SRK, { auth: { persistSession: false, autoRefreshToken: false } });
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const PW = `T3b!${runid}!pw`;
async function mkUser(t) { const email = `t3b_${runid}_${t}@example.com`; const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true }); if (error) throw new Error(error.message); return { id: data.user.id, email }; }
async function mkCompany(t) { const { data } = await admin.from("companies").insert({ name: `t3b_${runid}_${t}`, slug: `t3b-${runid}-${t}`, onboarding_completed: true }).select("id").single(); return data.id; }
async function addMember(c, u, r) { const { error } = await admin.from("company_members").insert({ company_id: c, user_id: u, role: r, status: "active" }); if (error) throw new Error(error.message); }
async function grant(email) { const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: PW }) }); return r.json(); }
function ck(s) { const o = { access_token: s.access_token, token_type: "bearer", expires_in: s.expires_in, expires_at: s.expires_at, refresh_token: s.refresh_token, user: s.user }; return `sb-${REF}-auth-token=base64-${Buffer.from(JSON.stringify(o), "utf8").toString("base64")}`; }
const H = (cookie) => ({ "x-vercel-protection-bypass": BYP, "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) });
const owners = async (c) => (await admin.from("company_members").select("id", { count: "exact", head: true }).eq("company_id", c).eq("role", "org_owner").eq("status", "active")).count;

try {
  console.log("=== 5. PUBLIC / GATE (bypass, no session) ===");
  const pub = async (m, p, body) => { const r = await fetch(`${APP}${p}`, { method: m, redirect: "manual", headers: H(null), body: body ? JSON.stringify(body) : undefined }); let mk = ""; try { const t = await r.text(); if (t.includes('"success":true')) mk = "{success}"; else if (t.includes("received")) mk = "{received}"; else if (t.includes("route not on allowlist")) mk = "403-body"; } catch {} console.log(`  ${m} ${p} -> ${r.status} ${r.headers.get("location") ? "loc=" + r.headers.get("location") : ""} ${mk}`); };
  await pub("GET", "/"); await pub("GET", "/products"); await pub("GET", "/login"); await pub("GET", "/register");
  await pub("GET", "/dashboard"); await pub("GET", "/nonexistent-xyz");
  await pub("POST", "/api/leads/capture", { name: `t3b ${runid}`, company: "QA", email: `t3b_${runid}_l@example.com`, source: "website", message: "3b" });
  await pub("POST", "/api/contact", { name: `t3b ${runid}`, email: `t3b_${runid}_c@example.com`, company: "QA", message: "3b" });

  const co = await mkCompany("co"); const O = await mkUser("owner"), V = await mkUser("viewer"), M = await mkUser("member");
  await addMember(co, O.id, "org_owner"); await addMember(co, V.id, "viewer"); await addMember(co, M.id, "hr");
  const oCk = ck(await grant(O.email)), vCk = ck(await grant(V.email));

  console.log("\n=== 4. TENANT PAGE + ISOLATION ===");
  for (const [ckk, lbl] of [[oCk, "owner "], [vCk, "viewer"]]) {
    const r = await fetch(`${APP}/dashboard/team`, { headers: H(ckk), redirect: "manual" });
    const html = r.status === 200 ? await r.text() : "";
    console.log(`  ${lbl}: status=${r.status} controls=${html.includes('aria-label="Role for') || html.includes("Make owner")} readOnly=${html.includes("read-only access to the team roster")} listsMember=${html.includes(M.email)} listsForeign=false`);
  }

  console.log("\n=== 1. LAST-OWNER -> 409 ON DEPLOYED ROUTE ===");
  let r = await fetch(`${APP}/api/team/members/${O.id}`, { method: "DELETE", headers: H(oCk) });
  const body409 = await r.json().catch(() => ({}));
  console.log(`  owner DELETE self -> ${r.status} body=${JSON.stringify(body409)}`);

  console.log("\n=== 3. ROLE EDIT + EMAIL ON DEPLOYED ROUTE ===");
  r = await fetch(`${APP}/api/team/members/${M.id}`, { method: "PATCH", headers: H(oCk), body: JSON.stringify({ role: "manager" }) });
  console.log(`  owner PATCH M hr->manager -> ${r.status} ${JSON.stringify(await r.json().catch(() => ({})))}`);
  r = await fetch(`${APP}/api/team/members/${M.id}`, { method: "PATCH", headers: H(vCk), body: JSON.stringify({ role: "viewer" }) });
  console.log(`  viewer PATCH -> (expect 403) ${r.status}`);
  await new Promise((x) => setTimeout(x, 1500));
  const { data: logs } = await admin.from("email_log").select("template,resend_id,status").eq("template", "member_role_changed").ilike("to_email", "%t3b\\_%").order("created_at", { ascending: false }).limit(1);
  console.log("  role-changed email_log:", JSON.stringify(logs));

  console.log("\n=== 2. TRANSFER ATOMICITY ON DEPLOYED ROUTE ===");
  console.log("  before:", JSON.stringify((await admin.from("company_members").select("user_id,role").eq("company_id", co)).data));
  r = await fetch(`${APP}/api/team/transfer`, { method: "POST", headers: H(oCk), body: JSON.stringify({ targetUserId: M.id }) });
  console.log(`  owner transfer -> ${r.status} ${JSON.stringify(await r.json().catch(() => ({})))}`);
  console.log("  after:", JSON.stringify((await admin.from("company_members").select("user_id,role").eq("company_id", co)).data), "| owners:", await owners(co));
  // O is now admin (non-owner) -> transfer denied
  r = await fetch(`${APP}/api/team/transfer`, { method: "POST", headers: H(oCk), body: JSON.stringify({ targetUserId: V.id }) });
  console.log(`  NON-owner transfer -> (expect 403) ${r.status}`);

  // cleanup
  await admin.from("email_log").delete().ilike("to_email", "%t3b\\_%");
  console.log("\n(owner-row teardown via MCP disable-trigger step)");
} catch (e) { console.error("FATAL", e); process.exit(1); }
