// Prompt 3a acceptance — items 1,2,3 at the DB/RLS/RPC layer with REAL user JWTs.
// No service-role client on the accept path (accept_invite RPC runs under the
// invitee's own bearer token via PostgREST). Service role is used ONLY for
// test setup/teardown and the DPA company insert (mirrors the onboarding action).
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync("c:/neonvisuals_v1/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const PW = `T3a!${runid}!pw`;
const sha256hex = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const admin = createClient(URL, SRK, { auth: { persistSession: false, autoRefreshToken: false } });

function userClient(token) {
  return createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
async function mkUser(tag) {
  const email = `t3a_${runid}_${tag}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
  if (error) throw new Error(`mkUser ${tag}: ${error.message}`);
  return { id: data.user.id, email };
}
async function token(email) {
  const c = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: PW });
  if (error) throw new Error(`token ${email}: ${error.message}`);
  return data.session.access_token;
}
const log = (...a) => console.log(...a);
const created = { users: [], companyId: null };

async function mkInvite({ companyId, email, role, invitedBy, rawToken, expiresAt, status = "pending", departmentId = null }) {
  const { error } = await admin.from("invites").insert({
    company_id: companyId, email: email.toLowerCase(), role, department_id: departmentId,
    token_hash: sha256hex(rawToken), expires_at: expiresAt, status, invited_by: invitedBy,
  });
  if (error) throw new Error(`mkInvite: ${error.message}`);
}

try {
  // ---- setup users ----
  const owner = await mkUser("owner");
  const invitee = await mkUser("invitee");
  const invitee2 = await mkUser("invitee2");
  const outsider = await mkUser("outsider");
  created.users.push(owner.id, invitee.id, invitee2.id, outsider.id);

  // =========================================================================
  // ITEM 1 — DPA capture at org creation (DB write mirrors the onboarding action)
  // =========================================================================
  const DPA_VERSION = "2026-07-16.v1";
  const dpaIp = "203.0.113.7";
  const { data: company, error: cErr } = await admin.from("companies").insert({
    name: `t3a_${runid}_Co`, slug: `t3a-${runid}-co`, onboarding_completed: true,
    created_by: owner.id, owner_id: owner.id,
    dpa_accepted_at: new Date().toISOString(), dpa_accepted_by: owner.id,
    dpa_version: DPA_VERSION, dpa_ip: dpaIp,
  }).select("id, name, dpa_accepted_at, dpa_accepted_by, dpa_version, dpa_ip").single();
  if (cErr) throw new Error(`company insert: ${cErr.message}`);
  created.companyId = company.id;
  log("\n=== ITEM 1: DPA row ===");
  log(JSON.stringify(company));
  log("dpa_ip present:", Boolean(company.dpa_ip), "| all four dpa_* set:",
    Boolean(company.dpa_accepted_at && company.dpa_accepted_by && company.dpa_version && company.dpa_ip));

  // owner membership (as the onboarding action writes)
  await admin.from("company_members").insert({ company_id: company.id, user_id: owner.id, role: "org_owner", status: "active" });

  const ownerTok = await token(owner.email);
  const inviteeTok = await token(invitee.email);
  const invitee2Tok = await token(invitee2.email);
  const outsiderTok = await token(outsider.email);

  // =========================================================================
  // ITEM 2 — invite creation gated by invites_manage RLS (owner OK, outsider denied)
  // =========================================================================
  log("\n=== ITEM 2: invite creation RLS ===");
  const rawA = randomBytes(32).toString("base64url");
  const expFuture = new Date(Date.now() + 7 * 86400000).toISOString();
  const ownerDb = userClient(ownerTok);
  const { data: invRow, error: invErr } = await ownerDb.from("invites").insert({
    company_id: company.id, email: invitee.email.toLowerCase(), role: "viewer",
    token_hash: sha256hex(rawA), expires_at: expFuture, status: "pending", invited_by: owner.id,
  }).select("id, email, role, status, expires_at, token_hash").single();
  log("owner(org_owner) create invite -> ", invErr ? `DENIED: ${invErr.message}` : "ALLOWED");
  if (invRow) {
    log("  token_hash stored:", invRow.token_hash.slice(0, 12) + "…  raw token != hash:", invRow.token_hash !== rawA);
    log("  status:", invRow.status, "| expires_at set:", Boolean(invRow.expires_at));
    log("  accept link (raw token only in link):", `${env.NEXT_PUBLIC_APP_URL ?? "https://neonvisuals.in"}/invite/accept?token=${rawA.slice(0,8)}…`);
  }
  const outsiderDb = userClient(outsiderTok);
  const { error: outErr } = await outsiderDb.from("invites").insert({
    company_id: company.id, email: "x@example.com", role: "viewer",
    token_hash: sha256hex("x"), expires_at: expFuture, status: "pending", invited_by: outsider.id,
  }).select("id").single();
  log("outsider(non-member) create invite -> ", outErr ? `DENIED (RLS) ✓` : "ALLOWED ✗ (LEAK!)");

  // =========================================================================
  // ITEM 3 — accept_invite RPC (all a–g) via invitee JWT, never service role
  // =========================================================================
  log("\n=== ITEM 3: accept_invite RPC ===");

  // (a) valid token -> self-insert + invite flips accepted. (invite invRow with rawA)
  const inviteeDb = userClient(inviteeTok);
  const { data: aData, error: aErr } = await inviteeDb.rpc("accept_invite", { raw_token: rawA });
  log("(a) valid accept ->", aErr ? `ERR ${aErr.message}` : `OK companyId=${aData}`);
  const { data: mRow } = await admin.from("company_members").select("company_id, user_id, role, status, invited_by").eq("user_id", invitee.id).maybeSingle();
  const { data: iRow } = await admin.from("invites").select("status, accepted_at").eq("token_hash", sha256hex(rawA)).maybeSingle();
  log("    membership row:", JSON.stringify(mRow));
  log("    invite row:", JSON.stringify(iRow));
  log("    user_id == invitee (derived):", mRow?.user_id === invitee.id, "| role == invite's 'viewer':", mRow?.role === "viewer");

  // (b) same token reused -> denied
  const { error: bErr } = await inviteeDb.rpc("accept_invite", { raw_token: rawA });
  log("(b) reuse same token ->", bErr ? `DENIED ✓ (${bErr.code ?? ""})` : "ALLOWED ✗");

  // (c) expired token -> denied (fresh invite, past expiry, for invitee2)
  const rawC = randomBytes(32).toString("base64url");
  await mkInvite({ companyId: company.id, email: invitee2.email, role: "viewer", invitedBy: owner.id, rawToken: rawC, expiresAt: new Date(Date.now() - 3600000).toISOString() });
  const invitee2Db = userClient(invitee2Tok);
  const { error: cErr2 } = await invitee2Db.rpc("accept_invite", { raw_token: rawC });
  log("(c) expired token ->", cErr2 ? `DENIED ✓` : "ALLOWED ✗");

  // (d) token for email X, caller is Y -> denied (invite addressed to outsider, invitee2 calls)
  const rawD = randomBytes(32).toString("base64url");
  await mkInvite({ companyId: company.id, email: outsider.email, role: "viewer", invitedBy: owner.id, rawToken: rawD, expiresAt: expFuture });
  const { error: dErr } = await invitee2Db.rpc("accept_invite", { raw_token: rawD });
  log("(d) email-bound (token for X, caller Y) ->", dErr ? `DENIED ✓` : "ALLOWED ✗");

  // (e) caller cannot obtain a different company/role than the invite.
  // The RPC takes ONLY raw_token; membership role/company come from the invite.
  // Demonstrate: a fresh user accepts an invite issued as 'hr'; membership role == 'hr' (invite's), not caller-chosen.
  const hrUser = await mkUser("hruser"); created.users.push(hrUser.id);
  const hrTok = await token(hrUser.email);
  const hrDb = userClient(hrTok);
  const rawE = randomBytes(32).toString("base64url");
  await mkInvite({ companyId: company.id, email: hrUser.email, role: "hr", invitedBy: owner.id, rawToken: rawE, expiresAt: expFuture });
  const { data: eData, error: eErr } = await hrDb.rpc("accept_invite", { raw_token: rawE });
  const { data: mRowE } = await admin.from("company_members").select("company_id, role").eq("user_id", hrUser.id).maybeSingle();
  log("(e) accept binds values to invite ->", eErr ? `ERR ${eErr.message}` : `OK; membership.role=${mRowE?.role} (invite said 'hr'), company=${mRowE?.company_id === company.id}`);
  log("    RPC signature takes ONLY raw_token — caller cannot request a different company/role.");

  // (f) bare self-insert with NO invite -> denied by RLS (outsider, not a member)
  const { error: fErr } = await outsiderDb.from("company_members").insert({ company_id: company.id, user_id: outsider.id, role: "org_admin", status: "active" }).select("id").single();
  log("(f) bare self-insert (no invite) ->", fErr ? `DENIED (RLS company_members_manage) ✓` : "ALLOWED ✗ (LEAK!)");

  // (g) concurrency: two accepts of one fresh token -> exactly one wins
  const rawG = randomBytes(32).toString("base64url");
  const gUser = await mkUser("concur"); created.users.push(gUser.id);
  const gTok = await token(gUser.email);
  await mkInvite({ companyId: company.id, email: gUser.email, role: "viewer", invitedBy: owner.id, rawToken: rawG, expiresAt: expFuture });
  const gDb1 = userClient(gTok); const gDb2 = userClient(gTok);
  const [g1, g2] = await Promise.allSettled([
    gDb1.rpc("accept_invite", { raw_token: rawG }),
    gDb2.rpc("accept_invite", { raw_token: rawG }),
  ]);
  const okCount = [g1, g2].filter((r) => r.status === "fulfilled" && !r.value.error).length;
  const errCount = [g1, g2].filter((r) => r.status === "fulfilled" && r.value.error).length + [g1, g2].filter((r) => r.status === "rejected").length;
  const { count: gMembers } = await admin.from("company_members").select("id", { count: "exact", head: true }).eq("user_id", gUser.id);
  log(`(g) concurrency two accepts -> ok=${okCount} err=${errCount}; membership rows for user=${gMembers} (expect exactly 1)`);

  // =========================================================================
  // CLEANUP + residue proof
  // =========================================================================
  log("\n=== CLEANUP ===");
  await admin.from("company_members").delete().eq("company_id", company.id);
  await admin.from("invites").delete().eq("company_id", company.id);
  await admin.from("companies").delete().eq("id", company.id);
  for (const id of created.users) await admin.auth.admin.deleteUser(id);
  // residue
  const { count: rc } = await admin.from("companies").select("id", { count: "exact", head: true }).ilike("name", "t3a\\_%");
  const { data: rInv } = await admin.from("invites").select("id").limit(5);
  const { data: rMem } = await admin.from("company_members").select("id").limit(5);
  const { data: usersLeft } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const t3aUsers = (usersLeft?.users ?? []).filter((u) => u.email?.startsWith("t3a_")).length;
  log(`RESIDUE companies(t3a_)=${rc} invites(total)=${(rInv ?? []).length} members(total)=${(rMem ?? []).length} auth_users(t3a_)=${t3aUsers}`);
} catch (e) {
  console.error("FATAL", e);
  // best-effort cleanup
  try { if (created.companyId) { await admin.from("company_members").delete().eq("company_id", created.companyId); await admin.from("invites").delete().eq("company_id", created.companyId); await admin.from("companies").delete().eq("id", created.companyId); } for (const id of created.users) await admin.auth.admin.deleteUser(id); } catch {}
  process.exit(1);
}
