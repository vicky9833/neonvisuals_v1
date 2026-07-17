import "./_env-preload";
/**
 * 6a item 2 (engine) + item 6 (prefs honored) + RLS own-read.
 * notify() to a 3-recipient hr audience with per-user prefs:
 *  r1 default (in_app+email), r2 email=false (in_app only), r3 in_app=false (email only).
 * Run: npx tsx --tsconfig verify6a/tsconfig.harness.json verify6a/_engine.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { notify, NOTIFICATION_TYPES } from "../src/lib/engines/notifications";

const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })) as Record<string, string>;
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SRK, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const PW = `T6a!${runid}!pw`;
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };
async function mkUser(tag: string) { const { data, error } = await admin.auth.admin.createUser({ email: `t6a_${runid}_${tag}@example.com`, password: PW, email_confirm: true }); if (error) throw new Error(`${tag}: ${error.message}`); return data.user.id; }

async function main() {
  const { data: co } = await admin.from("companies").insert({ name: `t6a_${runid}_E`, slug: `t6a-${runid}-e`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const A = co!.id as string;
  const r1 = await mkUser("r1"), r2 = await mkUser("r2"), r3 = await mkUser("r3");
  await admin.from("company_members").insert([
    { company_id: A, user_id: r1, role: "hr", status: "active" },
    { company_id: A, user_id: r2, role: "hr", status: "active" },
    { company_id: A, user_id: r3, role: "hr", status: "active" },
  ]);
  // Prefs: r2 email OFF (in_app on), r3 in_app OFF (email on). r1 = default (no row).
  await admin.from("notification_prefs").insert([
    { user_id: r2, type: NOTIFICATION_TYPES.OCCASION_REMINDER, in_app: true, email: false },
    { user_id: r3, type: NOTIFICATION_TYPES.OCCASION_REMINDER, in_app: false, email: true },
  ]);

  const res = await notify(admin, {
    type: NOTIFICATION_TYPES.OCCASION_REMINDER,
    audience: [{ plane: "tenant", role: "hr" }],
    companyId: A,
    title: `t6a ${runid} upcoming occasion`,
    body: "reference body",
    link: "/dashboard/occasions",
    email: { subject: `t6a ${runid} occasion reminder`, html: "<p>hi</p>", template: `t6a_${runid}_occ` },
  });

  console.log("=== ITEM 2: engine notify() with per-user prefs ===");
  check("resolved 3 recipients", res.recipients === 3, JSON.stringify(res));
  check("inApp = 2 (r1,r2; r3 in_app=false)", res.inApp === 2, `inApp=${res.inApp}`);
  check("emailed = 2 (r1,r3; r2 email=false)", res.emailed === 2, `emailed=${res.emailed}`);
  check("suppressedEmail = 1 (r2)", res.suppressedEmail === 1, `suppressed=${res.suppressedEmail}`);

  const { data: rows } = await admin.from("notifications").select("recipient_user_id, company_id, type, title, link, channels_sent").eq("company_id", A);
  const byUser = new Map((rows ?? []).map((r: any) => [r.recipient_user_id, r]));
  check("in-app rows for r1 and r2 only (r3 none)", (rows ?? []).length === 2 && byUser.has(r1) && byUser.has(r2) && !byUser.has(r3));
  const r1row: any = byUser.get(r1);
  check("r1 row correct (company/type/link)", r1row?.company_id === A && r1row?.type === NOTIFICATION_TYPES.OCCASION_REMINDER && r1row?.link === "/dashboard/occasions");
  check("r1 channels_sent = [in_app,email]", (r1row?.channels_sent ?? []).includes("in_app") && (r1row?.channels_sent ?? []).includes("email"), JSON.stringify(r1row?.channels_sent));
  check("r2 channels_sent = [in_app] only (email suppressed)", JSON.stringify((byUser.get(r2) as any)?.channels_sent) === JSON.stringify(["in_app"]));

  // Email log: r1 + r3 sent with real Resend id; r2 NOT sent.
  const { data: elog } = await admin.from("email_log").select("to_email, status, resend_id").eq("template", `t6a_${runid}_occ`);
  const sentTo = new Set((elog ?? []).filter((e: any) => e.status === "sent" && e.resend_id).map((e: any) => e.to_email));
  check("email sent (real Resend id) to r1 + r3", sentTo.has(`t6a_${runid}_r1@example.com`) && sentTo.has(`t6a_${runid}_r3@example.com`), `sent=${[...sentTo].length}`);
  check("NO email to r2 (email pref off)", !sentTo.has(`t6a_${runid}_r2@example.com`));

  console.log("\n=== RLS: a user reads only THEIR OWN notifications ===");
  const c1 = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
  await (c1 as any).auth.signInWithPassword({ email: `t6a_${runid}_r1@example.com`, password: PW });
  const { data: r1own } = await c1.from("notifications").select("recipient_user_id").eq("company_id", A);
  check("r1 JWT sees ONLY r1's notification (RLS)", (r1own ?? []).length === 1 && (r1own ?? [])[0].recipient_user_id === r1);

  // teardown (non-owner data)
  await admin.from("notifications").delete().eq("company_id", A);
  await admin.from("notification_prefs").delete().in("user_id", [r1, r2, r3]);
  await admin.from("email_log").delete().eq("template", `t6a_${runid}_occ`);
  await admin.from("company_members").delete().eq("company_id", A);
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
