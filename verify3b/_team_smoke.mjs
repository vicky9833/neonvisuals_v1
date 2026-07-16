// Prompt 3b items 4-5 — team page + role editor/remove via the REAL routes (dev
// server) under real Supabase SSR cookie sessions. Role-change email verified
// via email_log. Owner-row teardown via a follow-up MCP disable-trigger step.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/)
  .filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const APP = "http://localhost:3000";
const REF = "xserhblhiwtmaiejbvgo";
const admin = createClient(URL_, SRK, { auth: { persistSession: false, autoRefreshToken: false } });
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const PW = `T3b!${runid}!pw`;
async function mkUser(tag) { const email = `t3b_${runid}_${tag}@example.com`; const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true }); if (error) throw new Error(error.message); return { id: data.user.id, email }; }
async function mkCompany(tag) { const { data } = await admin.from("companies").insert({ name: `t3b_${runid}_${tag}`, slug: `t3b-${runid}-${tag}`, onboarding_completed: true }).select("id").single(); return data.id; }
async function addMember(c, u, r) { const { error } = await admin.from("company_members").insert({ company_id: c, user_id: u, role: r, status: "active" }); if (error) throw new Error(error.message); }
async function grant(email) { const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: PW }) }); return r.json(); }
function cookie(s) { const o = { access_token: s.access_token, token_type: "bearer", expires_in: s.expires_in, expires_at: s.expires_at, refresh_token: s.refresh_token, user: s.user }; return `sb-${REF}-auth-token=base64-${Buffer.from(JSON.stringify(o), "utf8").toString("base64")}`; }

try {
  const co = await mkCompany("teamco");
  const owner = await mkUser("owner"), viewer = await mkUser("viewer"), target = await mkUser("target");
  await addMember(co, owner.id, "org_owner"); await addMember(co, viewer.id, "viewer"); await addMember(co, target.id, "hr");
  const ownerCk = cookie(await grant(owner.email)); const viewerCk = cookie(await grant(viewer.email));

  console.log("=== ITEM 4: /dashboard/team page gating ===");
  const pageAs = async (ck, label) => {
    const res = await fetch(`${APP}/dashboard/team`, { headers: { Cookie: ck }, redirect: "manual" });
    const html = res.status === 200 ? await res.text() : "";
    const hasControls = html.includes('aria-label="Role for') || html.includes("Make owner");
    const readOnly = html.includes("read-only access to the team roster");
    console.log(`  ${label}: status=${res.status} controls=${hasControls} readOnlyNotice=${readOnly}`);
  };
  await pageAs(ownerCk, "owner ");
  await pageAs(viewerCk, "viewer");

  console.log("\n=== ITEM 5: role editor + remove (real routes) ===");
  // owner changes target's role hr -> manager
  let res = await fetch(`${APP}/api/team/members/${target.id}`, { method: "PATCH", headers: { Cookie: ownerCk, "Content-Type": "application/json" }, body: JSON.stringify({ role: "manager" }) });
  console.log("  owner PATCH role hr->manager:", res.status, JSON.stringify(await res.json().catch(() => ({}))));
  // non-owner (viewer) tries to change role -> 403
  res = await fetch(`${APP}/api/team/members/${target.id}`, { method: "PATCH", headers: { Cookie: viewerCk, "Content-Type": "application/json" }, body: JSON.stringify({ role: "viewer" }) });
  console.log("  viewer PATCH role -> (expect 403):", res.status);
  // last-owner via route: owner tries to remove the owner (self) -> 409 last_owner
  res = await fetch(`${APP}/api/team/members/${owner.id}`, { method: "DELETE", headers: { Cookie: ownerCk } });
  console.log("  owner DELETE owner (self) -> (expect 409 last_owner):", res.status, JSON.stringify(await res.json().catch(() => ({}))));
  // remove a normal member -> 200
  res = await fetch(`${APP}/api/team/members/${viewer.id}`, { method: "DELETE", headers: { Cookie: ownerCk } });
  console.log("  owner DELETE viewer -> (expect 200):", res.status, JSON.stringify(await res.json().catch(() => ({}))));

  // email_log for member_role_changed
  await new Promise((r) => setTimeout(r, 1500));
  const { data: logs } = await admin.from("email_log").select("template, resend_id, status, to_email").eq("template", "member_role_changed").order("created_at", { ascending: false }).limit(3);
  console.log("  email_log member_role_changed (recent):", JSON.stringify(logs));

  // cleanup email_log rows we created (best-effort: those to t3b addresses)
  await admin.from("email_log").delete().eq("template", "member_role_changed").ilike("to_email", "%t3b\\_%");
  console.log("\n(owner-row teardown handled by MCP disable-trigger step)");
} catch (e) { console.error("FATAL", e); process.exit(1); }
