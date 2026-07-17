import "./_env-preload";
/**
 * 6b item 3 — digests. Platform daily digest (in-app aggregate across orgs, PII-safe) +
 * per-user digest_frequency rollup (deferred immediate email -> ONE rollup).
 * Run: npx tsx --tsconfig verify6b/tsconfig.harness.json verify6b/_digests.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { notify, runPlatformDigest, runUserDigests, NOTIFICATION_TYPES } from "../src/lib/engines/notifications";

const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })) as Record<string, string>;
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (n: number) => iso(new Date(Date.now() + n * 86400_000));
async function mkUser(t: string) { const { data } = await admin.auth.admin.createUser({ email: `t6b_${runid}_${t}@example.com`, password: `T6b!${runid}!pw`, email_confirm: true }); return data!.user.id; }
const SENT = "Zzsentinelname";

async function main() {
  const today = iso(new Date(new Date().setHours(0, 0, 0, 0)));
  const { data: co } = await admin.from("companies").insert({ name: `t6b_${runid}_D`, slug: `t6b-${runid}-d`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const A = co!.id as string;
  const platAdmin = await mkUser("platadmin"), uDaily = await mkUser("udaily"), vNow = await mkUser("vnow");
  await admin.from("platform_staff").insert({ user_id: platAdmin, role: "admin" });
  await admin.from("company_members").insert([
    { company_id: A, user_id: uDaily, role: "hr", status: "active" },
    { company_id: A, user_id: vNow, role: "hr", status: "active" },
  ]);
  const { data: emp } = await admin.from("employees").insert({ company_id: A, full_name: `${SENT} Emp`, joining_date: null }).select("id").single();
  const E = emp!.id as string;
  // Occasions in the horizon (drive the platform aggregate). Insert with all NOT-NULL columns.
  await admin.from("occasions").insert([
    { company_id: A, employee_id: E, occasion_type_key: "birthday", title: `${SENT}'s Birthday`, date: addDays(10), lead_days: 14, recurrence: "annual", is_company_wide: false, status: "upcoming", auto_generated: true, is_sensitive: false },
    { company_id: A, employee_id: null, occasion_type_key: "festival", title: "Diwali", date: addDays(20), lead_days: 30, recurrence: "none", is_company_wide: true, status: "upcoming", auto_generated: true, is_sensitive: false },
  ]);

  console.log("=== ITEM 3: platform daily digest (in-app aggregate, PII-safe) ===");
  await runPlatformDigest(admin, today);
  const { data: pd } = await admin.from("notifications").select("recipient_user_id, title, body, dedupe_key").eq("type", NOTIFICATION_TYPES.PLATFORM_DIGEST).eq("recipient_user_id", platAdmin);
  check("platform_admin got a platform_digest in-app", (pd ?? []).length === 1, `count=${(pd ?? []).length}`);
  const dg: any = (pd ?? [])[0];
  check("digest title aggregates counts + org count", /\d+ upcoming gifting moment/.test(dg?.title ?? "") && /org/.test(dg?.title ?? ""), dg?.title);
  check("digest is PII-safe (no employee name in title/body)", !((dg?.title ?? "") + (dg?.body ?? "")).includes(SENT));
  await runPlatformDigest(admin, today); // 2nd run same day
  const { count: pdCount } = await admin.from("notifications").select("id", { count: "exact", head: true }).eq("type", NOTIFICATION_TYPES.PLATFORM_DIGEST).eq("recipient_user_id", platAdmin);
  check("platform digest idempotent per day (still 1)", pdCount === 1, `count=${pdCount}`);

  console.log("\n=== ITEM 3: per-user digest rollup (defer immediate email) ===");
  await admin.from("notification_prefs").insert({ user_id: uDaily, type: NOTIFICATION_TYPES.OCCASION_REMINDER, in_app: true, email: true, digest_frequency: "daily" });
  const tmpl = `t6b_${runid}_ev`;
  // Two events to the daily-digest user WITH an email spec -> both deferred (no immediate email).
  const r1 = await notify(admin, { type: NOTIFICATION_TYPES.OCCASION_REMINDER, recipients: [uDaily], companyId: A, title: "t6b digest item 1", email: { subject: "immediate?", html: "<p>1</p>", template: tmpl } });
  const r2 = await notify(admin, { type: NOTIFICATION_TYPES.OCCASION_REMINDER, recipients: [uDaily], companyId: A, title: "t6b digest item 2", email: { subject: "immediate?", html: "<p>2</p>", template: tmpl } });
  check("daily-digest user: emails DEFERRED (0 immediate)", r1.emailed === 0 && r2.emailed === 0 && r1.deferredDigest === 1 && r2.deferredDigest === 1, JSON.stringify([r1, r2]));
  const { data: immEmails } = await admin.from("email_log").select("id").eq("template", tmpl);
  check("NO per-event email sent to digest user", (immEmails ?? []).length === 0, `emails=${(immEmails ?? []).length}`);
  // Control: an immediate user gets the email now.
  const rV = await notify(admin, { type: NOTIFICATION_TYPES.OCCASION_REMINDER, recipients: [vNow], companyId: A, title: "t6b immediate", email: { subject: "now", html: "<p>v</p>", template: `t6b_${runid}_now` } });
  check("immediate user gets the email now (control)", rV.emailed === 1, JSON.stringify(rV));

  // Run the daily digest rollup -> ONE email to uDaily summarising the 2 items.
  const dres = await runUserDigests(admin, "daily");
  const { data: digestEmails } = await admin.from("email_log").select("to_email, subject").eq("template", "user_digest_daily").eq("to_email", `t6b_${runid}_udaily@example.com`);
  check("daily rollup sent ONE digest email to the user", (digestEmails ?? []).length === 1, `count=${(digestEmails ?? []).length}, sent=${dres.sent}`);
  check("digest subject is a rollup (count), PII-safe", /\d+ update/.test((digestEmails ?? [])[0]?.subject ?? "") && !((digestEmails ?? [])[0]?.subject ?? "").includes(SENT));
  await runUserDigests(admin, "daily"); // 2nd run same window
  const { count: dCount } = await admin.from("email_log").select("id", { count: "exact", head: true }).eq("template", "user_digest_daily").eq("to_email", `t6b_${runid}_udaily@example.com`);
  check("digest deduped per window (still 1)", dCount === 1, `count=${dCount}`);

  // teardown
  await admin.from("notifications").delete().eq("company_id", A);
  await admin.from("notification_prefs").delete().in("user_id", [uDaily, vNow]);
  await admin.from("email_log").delete().like("template", `t6b_${runid}_%`);
  await admin.from("email_log").delete().eq("to_email", `t6b_${runid}_udaily@example.com`);
  await admin.from("occasions").delete().eq("company_id", A);
  await admin.from("platform_staff").delete().eq("user_id", platAdmin);
  await admin.from("employees").delete().eq("company_id", A);
  await admin.from("company_members").delete().eq("company_id", A);
  await admin.from("companies").delete().eq("id", A);
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
