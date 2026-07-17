/**
 * Deploy-liveness probe #2 — HTTP-only 5b signal independent of the dashboard: the festival
 * Free=3 cap on POST /api/occasions/festivals (added in 5b; 5a was uncapped). Free company's
 * 4th opt-in -> 403 free_festival_limit means 5b code is deployed. Cleans data.
 * Run: npx tsx verify5b/_probe2.ts
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
  const email = `t5b_${runid}_p2@example.com`;
  const { data: u } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
  const ownerId = u!.user.id;
  const { data: co } = await admin.from("companies").insert({ name: `t5b_${runid}_p2free`, slug: `t5b-${runid}-p2free`, onboarding_completed: true, plan: "free" }).select("id").single();
  const A = co!.id as string;
  await admin.from("company_members").insert({ company_id: A, user_id: ownerId, role: "org_owner", status: "active" });
  const gr = await (await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: PW }) })).json();
  const cookie = ck(gr);
  const { data: fest } = await admin.from("festival_calendar").select("id").limit(5);
  const fids = (fest ?? []).map((f: any) => f.id as string);

  const post = async (prefs: any) => { const r = await fetch(`${APP}/api/occasions/festivals`, { method: "POST", headers: { "x-vercel-protection-bypass": BYP, "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ preferences: prefs }) }); const j = await r.json().catch(() => ({})); return { status: r.status, j }; };
  const three = await post(fids.slice(0, 3).map((festival_id) => ({ festival_id, is_active: true })));
  const fourth = await post([{ festival_id: fids[3], is_active: true }]);
  console.log(`3 opt-in -> ${three.status}; 4th opt-in -> ${fourth.status} ${JSON.stringify(fourth.j).slice(0, 90)}`);
  const live = fourth.status === 403 && fourth.j?.reason === "free_festival_limit";
  console.log(`>>> ${live ? "5b LIVE (cap enforced)" : "NOT live (4th allowed -> still 5a)"}`);

  await admin.from("company_festivals").delete().eq("company_id", A);
  console.log("(probe owner member/user left for MCP cleanup)");
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
