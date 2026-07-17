/**
 * Diag2: inspect leftover failed-run data — did the profiles row get inserted for the owner,
 * and does getProfile-style resolution find company_id? Also test the deployed dashboard once
 * more against a freshly-seeded owner WITH a verified profiles row, checking occasions after.
 * Run: npx tsx verify5b/_diag2.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })) as Record<string, string>;
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SRK = env.SUPABASE_SERVICE_ROLE_KEY, BYP = env.VERCEL_AUTOMATION_BYPASS;
const APP = "https://neonvisuals-v1-iou9-git-foundation-vicky9833s-projects.vercel.app";
const REF = "xserhblhiwtmaiejbvgo";
const admin = createClient(URL_, SRK, { auth: { persistSession: false, autoRefreshToken: false } });
function ck(s: any) { const o = { access_token: s.access_token, token_type: "bearer", expires_in: s.expires_in, expires_at: s.expires_at, refresh_token: s.refresh_token, user: s.user }; return `sb-${REF}-auth-token=base64-${Buffer.from(JSON.stringify(o), "utf8").toString("base64")}`; }

async function main() {
  // 1. Inspect the most recent leftover t5b_ pro company + its owner profile.
  const { data: cos } = await admin.from("companies").select("id, name, created_at").like("name", "t5b_%pro").order("created_at", { ascending: false }).limit(1);
  if (!cos?.length) { console.log("no leftover t5b_ pro company"); }
  else {
    const co = cos[0]; const A = co.id as string;
    const { data: mem } = await admin.from("company_members").select("user_id, role").eq("company_id", A).eq("role", "org_owner");
    const ownerId = mem?.[0]?.user_id as string;
    const { data: prof } = await admin.from("profiles").select("id, email, company_id, is_onboarded").eq("id", ownerId).maybeSingle();
    console.log("leftover pro company:", co.name);
    console.log("  owner profiles row:", prof ? JSON.stringify(prof) : "MISSING");
    const { count: occCount } = await admin.from("occasions").select("id", { count: "exact", head: true }).eq("company_id", A);
    console.log("  occasions for that company:", occCount ?? 0);
  }

  // 2. Fresh owner WITH verified profiles row -> render deployed dashboard -> check occasions.
  const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const PW = `T5b!${runid}!pw`;
  const email = `t5b_${runid}_d2@example.com`;
  const { data: u } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
  const ownerId = u!.user.id;
  const { data: co } = await admin.from("companies").insert({ name: `t5b_${runid}_d2`, slug: `t5b-${runid}-d2`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const A = co!.id as string;
  await admin.from("company_members").insert({ company_id: A, user_id: ownerId, role: "org_owner", status: "active" });
  const { error: pe } = await admin.from("profiles").update({ company_id: A, is_onboarded: true, full_name: `t5b_${runid}_D2` }).eq("id", ownerId);
  console.log("\nprofiles UPDATE error:", pe ? pe.message : "none");
  const { data: prof2 } = await admin.from("profiles").select("id, company_id").eq("id", ownerId).maybeSingle();
  console.log("verified profiles row:", JSON.stringify(prof2));
  const { data: e } = await admin.from("employees").insert({ company_id: A, full_name: `t5b_${runid}_D2E`, joining_date: "2015-06-15" }).select("id");
  await admin.from("employee_pii").insert({ employee_id: e![0].id, company_id: A, phone_enc: "enc", dob_day: 15, dob_month: 6 });
  const gr = await (await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: PW }) })).json();
  const cookie = ck(gr);

  const r = await fetch(`${APP}/dashboard`, { headers: { "x-vercel-protection-bypass": BYP, Cookie: cookie }, redirect: "manual" });
  const bodyLen = (await r.text()).length;
  await new Promise((x) => setTimeout(x, 2500));
  const { count } = await admin.from("occasions").select("id", { count: "exact", head: true }).eq("company_id", A).eq("auto_generated", true);
  console.log(`\ndeployed /dashboard status=${r.status} bodyLen=${bodyLen}`);
  console.log(`occasions written = ${count ?? 0}  ->  ${(count ?? 0) > 0 ? "GENERATION WORKS with profiles" : "STILL 0 (server-component write issue or company unresolved)"}`);

  await admin.from("occasions").delete().eq("company_id", A);
  await admin.from("employee_pii").delete().eq("company_id", A);
  await admin.from("employees").delete().eq("company_id", A);
  await admin.from("profiles").delete().eq("id", ownerId);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
