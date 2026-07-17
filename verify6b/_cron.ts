import "./_env-preload";
/**
 * 6b item 4 — the escalation+digest scan is idempotent (a second run the same day does NOT
 * re-fire) and is wired into the cron. This mirrors the cron's per-company escalation loop +
 * digests, run TWICE, asserting no duplication. (The cron wiring itself is in
 * src/app/api/reminders/cron/route.ts; cold-render safety = poll discipline in the smoke.)
 * Run: npx tsx --tsconfig verify6b/tsconfig.harness.json verify6b/_cron.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { runOccasionEscalation, runPlatformDigest, stableOccasionKey, NOTIFICATION_TYPES } from "../src/lib/engines/notifications";

const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })) as Record<string, string>;
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (n: number) => iso(new Date(Date.now() + n * 86400_000));
async function mkUser(t: string) { const { data } = await admin.auth.admin.createUser({ email: `t6b_${runid}_${t}@example.com`, password: `T6b!${runid}!pw`, email_confirm: true }); return data!.user.id; }

async function main() {
  const today = iso(new Date(new Date().setHours(0, 0, 0, 0)));
  const { data: co } = await admin.from("companies").insert({ name: `t6b_${runid}_C`, slug: `t6b-${runid}-c`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const A = co!.id as string;
  const hr = await mkUser("hr"), platAdmin = await mkUser("platadmin");
  await admin.from("company_members").insert({ company_id: A, user_id: hr, role: "hr", status: "active" });
  await admin.from("platform_staff").insert({ user_id: platAdmin, role: "admin" });
  const { data: emp } = await admin.from("employees").insert({ company_id: A, full_name: `t6b_${runid}_Emp`, joining_date: null }).select("id").single();
  const E = emp!.id as string;
  const occ = { id: "z1", company_id: A, employee_id: E, occasion_type_key: "birthday", title: "occ", date: addDays(5), lead_days: 14 };
  const company = { name: `t6b_${runid}_C`, plan: "pro", primary_contact_name: null, primary_contact_phone: null };

  // "cron block" x2 (same day).
  const runCron = async () => { await runOccasionEscalation(admin, occ, company, today); await runPlatformDigest(admin, today); };
  await runCron();
  const escKey = `occ-esc:${stableOccasionKey(occ)}:2`;
  const c1 = (await admin.from("notifications").select("id", { count: "exact", head: true }).eq("dedupe_key", escKey)).count ?? 0;
  const pd1 = (await admin.from("notifications").select("id", { count: "exact", head: true }).eq("type", NOTIFICATION_TYPES.PLATFORM_DIGEST).eq("recipient_user_id", platAdmin)).count ?? 0;
  await runCron(); // second run same day
  const c2 = (await admin.from("notifications").select("id", { count: "exact", head: true }).eq("dedupe_key", escKey)).count ?? 0;
  const pd2 = (await admin.from("notifications").select("id", { count: "exact", head: true }).eq("type", NOTIFICATION_TYPES.PLATFORM_DIGEST).eq("recipient_user_id", platAdmin)).count ?? 0;

  console.log("=== ITEM 4: escalation + digest scan idempotency ===");
  check("stage2 fired once after run 1", c1 === 1, `c1=${c1}`);
  check("stage2 NOT re-fired after run 2 (dedupe)", c2 === 1, `c2=${c2}`);
  check("platform digest once after run 1", pd1 === 1, `pd1=${pd1}`);
  check("platform digest NOT re-fired after run 2 (per-day dedupe)", pd2 === 1, `pd2=${pd2}`);

  // teardown
  await admin.from("notifications").delete().eq("company_id", A);
  await admin.from("notifications").delete().eq("recipient_user_id", platAdmin);
  await admin.from("platform_staff").delete().eq("user_id", platAdmin);
  await admin.from("employees").delete().eq("company_id", A);
  await admin.from("company_members").delete().eq("company_id", A);
  await admin.from("companies").delete().eq("id", A);
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
