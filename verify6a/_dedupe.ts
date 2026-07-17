import "./_env-preload";
/**
 * 6a item 2 — in-app dedupe. Two cron runs (occasion regenerated → new occasion.id each run) for
 * the SAME occasion+recipient must NOT accumulate duplicate bell notifications. Proven against the
 * DEPLOYED DB's unique index (migration 040) — the deployed cron runs this same engine.
 * Run: npx tsx --tsconfig verify6a/tsconfig.harness.json verify6a/_dedupe.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { notifyOccasionAtLeadTime, NOTIFICATION_TYPES } from "../src/lib/engines/notifications";

const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })) as Record<string, string>;
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };
async function mkUser(tag: string) { const { data } = await admin.auth.admin.createUser({ email: `t6a_${runid}_${tag}@example.com`, password: `T6a!${runid}!pw`, email_confirm: true }); return data!.user.id; }

async function main() {
  const { data: co } = await admin.from("companies").insert({ name: `t6a_${runid}_Dd`, slug: `t6a-${runid}-dd`, onboarding_completed: true, plan: "pro", primary_contact_phone: "9876500044" }).select("id").single();
  const A = co!.id as string;
  const hr = await mkUser("hr"), plat = await mkUser("plat");
  await admin.from("company_members").insert({ company_id: A, user_id: hr, role: "hr", status: "active" });
  await admin.from("platform_staff").insert({ user_id: plat, role: "admin" });
  const { data: emp } = await admin.from("employees").insert({ company_id: A, full_name: `t6a_${runid}_Emp`, joining_date: null }).select("id").single();
  const E = emp!.id as string;
  const date = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
  const company = { name: `t6a_${runid}_Dd`, plan: "pro", primary_contact_name: "C", primary_contact_phone: "9876500044" };

  // CRON RUN 1 (occasion id #1).
  await notifyOccasionAtLeadTime(admin, { id: `00000000-0000-0000-0000-0000000011a1`, company_id: A, employee_id: E, occasion_type_key: "birthday", title: `t6a birthday`, date }, company);
  // CRON RUN 2 — occasion REGENERATED: DIFFERENT id, SAME (company,employee,type,date).
  await notifyOccasionAtLeadTime(admin, { id: `00000000-0000-0000-0000-0000000022b2`, company_id: A, employee_id: E, occasion_type_key: "birthday", title: `t6a birthday`, date }, company);

  const { count: hrCount } = await admin.from("notifications").select("id", { count: "exact", head: true }).eq("company_id", A).eq("recipient_user_id", hr).eq("type", NOTIFICATION_TYPES.OCCASION_REMINDER);
  const { count: platCount } = await admin.from("notifications").select("id", { count: "exact", head: true }).eq("company_id", A).eq("recipient_user_id", plat).eq("type", NOTIFICATION_TYPES.OCCASION_OPS);
  console.log("=== ITEM 2: in-app dedupe across two cron runs (regeneration trap) ===");
  check("hr has exactly ONE occasion in-app (not one-per-run)", hrCount === 1, `count=${hrCount}`);
  check("platform admin has exactly ONE occasion_ops in-app", platCount === 1, `count=${platCount}`);

  // A DIFFERENT occasion (different date) is NOT deduped away.
  const date2 = new Date(Date.now() + 20 * 86400_000).toISOString().slice(0, 10);
  await notifyOccasionAtLeadTime(admin, { id: `00000000-0000-0000-0000-0000000033c3`, company_id: A, employee_id: E, occasion_type_key: "birthday", title: `t6a birthday 2`, date: date2 }, company);
  const { count: hrCount2 } = await admin.from("notifications").select("id", { count: "exact", head: true }).eq("company_id", A).eq("recipient_user_id", hr).eq("type", NOTIFICATION_TYPES.OCCASION_REMINDER);
  check("a DISTINCT occasion (different date) still notifies (now 2)", hrCount2 === 2, `count=${hrCount2}`);

  await admin.from("notifications").delete().eq("company_id", A);
  await admin.from("platform_staff").delete().eq("user_id", plat);
  await admin.from("employees").delete().eq("company_id", A);
  await admin.from("company_members").delete().eq("company_id", A);
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
