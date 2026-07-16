import { createClient } from "@supabase/supabase-js";
import { randomBytes, createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const BYPASS = env.VERCEL_AUTOMATION_BYPASS;
const PREVIEW = "https://neonvisuals-v1-iou9-git-foundation-vicky9833s-projects.vercel.app";
const REF = "xserhblhiwtmaiejbvgo";
const admin = createClient(URL_, SRK, { auth: { persistSession: false, autoRefreshToken: false } });
const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const PW = `T3a!${runid}!pw`;
const users = [];

async function mkUser(tag) {
  const email = `t3a_${runid}_${tag}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
  if (error) throw new Error(`mkUser ${tag}: ${error.message}`);
  users.push(data.user.id);
  return { id: data.user.id, email };
}
async function grant(email) {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PW }),
  });
  return r.json();
}
function ssrCookie(session) {
  const s = { access_token: session.access_token, token_type: "bearer", expires_in: session.expires_in, expires_at: session.expires_at, refresh_token: session.refresh_token, user: session.user };
  const val = "base64-" + Buffer.from(JSON.stringify(s), "utf8").toString("base64");
  return `sb-${REF}-auth-token=${val}`;
}
function userClient(token) {
  return createClient(URL_, ANON, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
}
const R = {};

try {
  // ===== ITEM 4: public surface unbroken (bypass token, no supabase auth) =====
  console.log("=== ITEM 4: public surface ===");
  const pub = async (m, p, body) => {
    const res = await fetch(`${PREVIEW}${p}`, { method: m, redirect: "manual",
      headers: { "x-vercel-protection-bypass": BYPASS, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined });
    let mark = ""; try { const t = await res.text(); if (t.includes('"success":true')) mark = "{success}"; else if (t.includes("received")) mark = "{received}"; else if (t.includes("route not on allowlist")) mark = "ALLOWLIST-403"; } catch {}
    console.log(`  ${m} ${p} -> ${res.status} ${res.headers.get("location") ? "loc=" + res.headers.get("location") : ""} ${mark}`);
    return res.status;
  };
  await pub("GET", "/"); await pub("GET", "/products"); await pub("GET", "/login"); await pub("GET", "/register");
  await pub("GET", "/dashboard"); await pub("GET", "/nonexistent-xyz");
  await pub("POST", "/api/leads/capture", { name: `t3a ${runid}`, company: "QA", email: `t3a_${runid}_lead@example.com`, source: "website", message: "3a preview" });
  await pub("POST", "/api/contact", { name: `t3a ${runid}`, email: `t3a_${runid}_c@example.com`, company: "QA", message: "3a preview" });

  // ===== setup: owner + company(DPA) + membership; invitee; reuse invitee =====
  const owner = await mkUser("owner");
  const invitee = await mkUser("invitee");
  const DPA_VERSION = "2026-07-16.v1";
  const { data: company } = await admin.from("companies").insert({
    name: `t3a_${runid}_Co`, slug: `t3a-${runid}-co`, onboarding_completed: true, created_by: owner.id, owner_id: owner.id,
    dpa_accepted_at: new Date().toISOString(), dpa_accepted_by: owner.id, dpa_version: DPA_VERSION, dpa_ip: "203.0.113.9",
  }).select("id, name, dpa_accepted_at, dpa_accepted_by, dpa_version, dpa_ip").single();
  await admin.from("company_members").insert({ company_id: company.id, user_id: owner.id, role: "org_owner", status: "active" });
  console.log("\n=== ITEM 3: DPA row (deployed shared DB) ===");
  console.log("  " + JSON.stringify(company));

  // ===== ITEM 1: invite create via DEPLOYED /api/team/invites (owner SSR cookie) =====
  console.log("\n=== ITEM 1: invite create via deployed /api/team/invites ===");
  const ownerSess = await grant(owner.email);
  const cookie = ssrCookie(ownerSess);
  const createRes = await fetch(`${PREVIEW}/api/team/invites`, {
    method: "POST", redirect: "manual",
    headers: { "x-vercel-protection-bypass": BYPASS, "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ email: invitee.email, role: "viewer" }),
  });
  const createTxt = await createRes.text();
  console.log(`  POST /api/team/invites -> ${createRes.status}`);
  let acceptUrl = null, rawToken = null;
  try { const j = JSON.parse(createTxt); acceptUrl = j?.data?.acceptUrl ?? null; if (acceptUrl) rawToken = new URL(acceptUrl).searchParams.get("token"); } catch {}
  console.log(`  body: ${createTxt.slice(0, 200)}`);
  R.createDeployed = createRes.status === 201 && !!rawToken;

  if (R.createDeployed) {
    const { data: invRow } = await admin.from("invites").select("email, role, status, token_hash, expires_at").eq("company_id", company.id).maybeSingle();
    console.log("  invite row:", JSON.stringify(invRow), "| token_hash==sha256(raw):", invRow?.token_hash === sha256(rawToken), "| raw only in link");
  } else {
    console.log("  (deployed create did not return a token — SSR cookie likely not accepted; see note)");
    // Fallback: create the invite under owner bearer JWT (same RLS + shared DB the route uses)
    rawToken = randomBytes(32).toString("base64url");
    const ownerDb = userClient(ownerSess.access_token);
    const { error: cerr } = await ownerDb.from("invites").insert({ company_id: company.id, email: invitee.email.toLowerCase(), role: "viewer", token_hash: sha256(rawToken), expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), status: "pending", invited_by: owner.id });
    console.log("  fallback owner-JWT invite insert (RLS invites_manage):", cerr ? `DENIED ${cerr.message}` : "OK");
  }

  // ===== ITEM 1: accept via invitee session RPC (shared DB the preview uses) =====
  console.log("\n=== ITEM 1: accept_invite under invitee session ===");
  const inviteeSess = await grant(invitee.email);
  const inviteeDb = userClient(inviteeSess.access_token);
  const { data: aData, error: aErr } = await inviteeDb.rpc("accept_invite", { raw_token: rawToken });
  console.log("  accept ->", aErr ? `ERR ${aErr.message}` : `OK companyId=${aData}`);
  const { data: mRow } = await admin.from("company_members").select("company_id, user_id, role, status, invited_by").eq("user_id", invitee.id).maybeSingle();
  const { data: iRow } = await admin.from("invites").select("status, accepted_at").eq("token_hash", sha256(rawToken)).maybeSingle();
  console.log("  membership row:", JSON.stringify(mRow));
  console.log("  invite row:", JSON.stringify(iRow));
  const { error: reErr } = await inviteeDb.rpc("accept_invite", { raw_token: rawToken });
  console.log("  reuse same token ->", reErr ? "DENIED ✓" : "ALLOWED ✗");

  // ===== cleanup =====
  await admin.from("company_members").delete().eq("company_id", company.id);
  await admin.from("invites").delete().eq("company_id", company.id);
  await admin.from("companies").delete().eq("id", company.id);
  for (const id of users) await admin.auth.admin.deleteUser(id);
  const { data: leads } = await admin.from("leads").select("id").ilike("contact_email", "t3a\\_%");
  for (const l of (leads ?? [])) await admin.from("leads").delete().eq("id", l.id);
  const { count: co } = await admin.from("companies").select("id", { count: "exact", head: true }).ilike("name", "t3a\\_%");
  const { data: uleft } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const t3aU = (uleft?.users ?? []).filter((u) => u.email?.startsWith("t3a_")).length;
  const { data: lLeft } = await admin.from("leads").select("id").ilike("contact_email", "t3a\\_%");
  console.log(`\nRESIDUE companies(t3a_)=${co} auth_users(t3a_)=${t3aU} leads(t3a_)=${(lLeft ?? []).length}`);
} catch (e) {
  console.error("FATAL", e);
  try { for (const id of users) await admin.auth.admin.deleteUser(id); } catch {}
  process.exit(1);
}
