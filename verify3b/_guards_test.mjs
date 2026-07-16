// Prompt 3b items 1-3 — ownership guards (exactly-one-owner reality).
// Item 1 via DIRECT SQL (service role) — triggers fire for every role. Items 2-3
// via REAL user JWTs. Owner-row teardown needs the trigger disabled → done by a
// separate MCP step after this script (guard blocks deleting the sole owner).
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/)
  .filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SRK, { auth: { persistSession: false, autoRefreshToken: false } });
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const PW = `T3b!${runid}!pw`;
const isLast = (e) => e && (e.message || "").includes("LAST_OWNER");
const isTransfer = (e) => e && (e.message || "").includes("TRANSFER");
async function mkUser(tag) { const email = `t3b_${runid}_${tag}@example.com`; const { data, error } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true }); if (error) throw new Error(error.message); return { id: data.user.id, email }; }
async function mkCompany(tag) { const { data, error } = await admin.from("companies").insert({ name: `t3b_${runid}_${tag}`, slug: `t3b-${runid}-${tag}`, onboarding_completed: true }).select("id").single(); if (error) throw new Error(error.message); return data.id; }
async function addMember(c, u, r) { const { error } = await admin.from("company_members").insert({ company_id: c, user_id: u, role: r, status: "active" }); if (error) throw new Error(`addMember ${r}: ${error.message}`); }
async function token(email) { const c = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } }); const { data, error } = await c.auth.signInWithPassword({ email, password: PW }); if (error) throw new Error(error.message); return data.session.access_token; }
const udb = (t) => createClient(URL_, ANON, { global: { headers: { Authorization: `Bearer ${t}` } }, auth: { persistSession: false, autoRefreshToken: false } });
const owners = async (c) => (await admin.from("company_members").select("id", { count: "exact", head: true }).eq("company_id", c).eq("role", "org_owner").eq("status", "active")).count;

try {
  // ============ ITEM 1: last-owner (direct SQL) ============
  console.log("=== ITEM 1: last-owner guard (direct SQL, exactly-one-owner) ===");
  const coA = await mkCompany("A"); const oA = await mkUser("ownerA"); const mA = await mkUser("memberA");
  await addMember(coA, oA.id, "org_owner"); await addMember(coA, mA.id, "viewer");
  let r;
  r = await admin.from("company_members").update({ role: "org_admin" }).eq("company_id", coA).eq("user_id", oA.id);
  console.log("  demote sole owner       ->", isLast(r.error) ? "DENIED ✓ (LAST_OWNER)" : `?? ${r.error?.message ?? "ALLOWED ✗"}`);
  r = await admin.from("company_members").update({ status: "inactive" }).eq("company_id", coA).eq("user_id", oA.id);
  console.log("  deactivate sole owner   ->", isLast(r.error) ? "DENIED ✓ (LAST_OWNER)" : `?? ${r.error?.message ?? "ALLOWED ✗"}`);
  r = await admin.from("company_members").delete().eq("company_id", coA).eq("user_id", oA.id);
  console.log("  delete sole owner       ->", isLast(r.error) ? "DENIED ✓ (LAST_OWNER)" : `?? ${r.error?.message ?? "ALLOWED ✗"}`);
  console.log("  active owners (unchanged):", await owners(coA));

  // ============ ITEM 2: self-demote ============
  console.log("\n=== ITEM 2: self-demote (real JWT) ===");
  const oAtok = await token(oA.email);
  r = await udb(oAtok).from("company_members").update({ role: "org_admin" }).eq("company_id", coA).eq("user_id", oA.id);
  console.log("  sole owner self-demote  ->", isLast(r.error) ? "DENIED ✓ (LAST_OWNER)" : `?? ${r.error?.message ?? "ALLOWED ✗"}`);
  // "non-sole owner self-demote" is structurally impossible (one_org_owner_per_company).
  // Prove the guard is OWNER-SPECIFIC: a non-owner (org_admin) self-demoting to viewer is ALLOWED.
  const aA = await mkUser("adminA"); await addMember(coA, aA.id, "org_admin"); const aAtok = await token(aA.email);
  r = await udb(aAtok).from("company_members").update({ role: "viewer" }).eq("company_id", coA).eq("user_id", aA.id).select("role");
  console.log("  non-owner (admin) self-demote to viewer ->", r.error ? `DENIED ✗ ${r.error.message}` : `ALLOWED ✓ ${JSON.stringify(r.data)}`);
  console.log("  (a 'non-sole owner' cannot exist under one_org_owner_per_company — noted)");

  // ============ ITEM 3: transfer ============
  console.log("\n=== ITEM 3: transfer_ownership (real JWT) ===");
  const coC = await mkCompany("C"); const oC = await mkUser("ownerC"); const mC = await mkUser("memberC");
  await addMember(coC, oC.id, "org_owner"); await addMember(coC, mC.id, "viewer");
  const oCtok = await token(oC.email), mCtok = await token(mC.email);
  console.log("  before:", JSON.stringify((await admin.from("company_members").select("user_id,role").eq("company_id", coC)).data));
  const { data: tData, error: tErr } = await udb(oCtok).rpc("transfer_ownership", { target_user_id: mC.id });
  console.log("  owner transfers to memberC ->", tErr ? `ERR ${tErr.message}` : `OK company=${tData}`);
  const after = (await admin.from("company_members").select("user_id,role").eq("company_id", coC)).data;
  console.log("  after:", JSON.stringify(after), "| owners:", await owners(coC));
  console.log("  target is sole owner:", after.find((x) => x.user_id === mC.id)?.role === "org_owner", "| prior owner -> admin:", after.find((x) => x.user_id === oC.id)?.role === "org_admin", "| exactly one owner:", (await owners(coC)) === 1);
  // non-owner calls transfer (oC is now admin)
  const { error: nonOwner } = await udb(oCtok).rpc("transfer_ownership", { target_user_id: mC.id });
  console.log("  NON-owner calls transfer ->", isTransfer(nonOwner) ? "DENIED ✓" : (nonOwner ? `DENIED ✓ ${nonOwner.message}` : "ALLOWED ✗"));
  // non-member / cross-company target
  const outsider = await mkUser("outsiderX");
  const { error: cross } = await udb(mCtok).rpc("transfer_ownership", { target_user_id: outsider.id });
  console.log("  transfer to non-member ->", isTransfer(cross) ? "DENIED ✓" : (cross ? `DENIED ✓ ${cross.message}` : "ALLOWED ✗"));
  // CLIENT cannot reach the bypass: current owner (mC) tries to demote self directly (flag unset) -> guard blocks
  const { error: bare } = await udb(mCtok).from("company_members").update({ role: "org_admin" }).eq("company_id", coC).eq("user_id", mC.id);
  console.log("  client bare owner-swap (no flag) ->", isLast(bare) ? "DENIED ✓ (bypass unreachable outside transfer)" : `?? ${bare?.message ?? "ALLOWED ✗"}`);
  // concurrency: two simultaneous transfers by current owner (mC) -> exactly one applies
  const [c1, c2] = await Promise.allSettled([
    udb(mCtok).rpc("transfer_ownership", { target_user_id: oC.id }),
    udb(mCtok).rpc("transfer_ownership", { target_user_id: oC.id }),
  ]);
  const ok = [c1, c2].filter((x) => x.status === "fulfilled" && !x.value.error).length;
  console.log(`  concurrency two transfers -> ok=${ok} err=${2 - ok} | owners after: ${await owners(coC)} (expect 1)`);

  console.log("\n(owner-row teardown handled by the MCP disable-trigger cleanup step)");
} catch (e) { console.error("FATAL", e); process.exit(1); }
