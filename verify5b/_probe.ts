/**
 * Fast single-shot deploy-liveness probe: create throwaway owner+company+employee, render the
 * DEPLOYED /dashboard once, check if occasions got written (5b live) or not (still 5a). Cleans data.
 * Run: npx tsx verify5b/_probe.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })) as Record<string, string>;
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SRK = env.SUPABASE_SERVICE_ROLE_KEY, BYP = env.VERCEL_AUTOMATION_BYPASS;
const APP = "https://neonvisuals-v1-iou9-git-foundation-vicky9833s-projects.vercel.app";
const REF = "xserhblhiwtmaiejbvgo";
const admin = createClient(URL_, SRK, { auth: { persistSession: false, autoRefreshToken: false } });
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const PW = `T5b!${runid}!pw`;
function ck(s: any) { const o = { access_token: s.access_token, token_type: "bearer", expires_in: s.expires_in, expires_at: s.expires_at, refresh_token: s.refresh_token, user: s.user }; return `sb-${REF}-auth-token=base64-${Buffer.from(JSON.stringify(o), "utf8").toString("base64")}`; }

async function main() {
  const email = `t5b_${runid}_probe@example.com`;
  const { data: u } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
  const ownerId = u!.user.id;
  const { data: co } = await admin.from("companies").insert({ name: `t5b_${runid}_probe`, slug: `t5b-${runid}-probe`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const A = co!.id as string;
  await admin.from("company_members").insert({ company_id: A, user_id: ownerId, role: "org_owner", status: "active" });
  const { data: e } = await admin.from("employees").insert({ company_id: A, full_name: `t5b_${runid}_PB`, joining_date: "2015-06-15" }).select("id");
  await admin.from("employee_pii").insert({ employee_id: e![0].id, company_id: A, phone_enc: "enc", dob_day: 15, dob_month: 6 });
  const gr = await (await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: PW }) })).json();
  const cookie = ck(gr);

  const r = await fetch(`${APP}/dashboard`, { headers: { "x-vercel-protection-bypass": BYP, Cookie: cookie }, redirect: "manual" });
  const vid = r.headers.get("x-vercel-id");
  await new Promise((x) => setTimeout(x, 1500));
  const { count } = await admin.from("occasions").select("id", { count: "exact", head: true }).eq("company_id", A).eq("auto_generated", true);
  console.log(`dashboard status=${r.status} x-vercel-id=${vid}`);
  console.log(`occasions written = ${count ?? 0}  ->  ${(count ?? 0) > 0 ? "5b LIVE" : "NOT live (still 5a / building)"}`);

  await admin.from("occasions").delete().eq("company_id", A);
  await admin.from("employee_pii").delete().eq("company_id", A);
  await admin.from("employees").delete().eq("company_id", A);
  console.log("(probe owner member/user left for MCP cleanup)");
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
