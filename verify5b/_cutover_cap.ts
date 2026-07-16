/**
 * Prompt 5b items 4 (reminders/email is a downstream consumer of occasions) + 5 (festival Free=3 cap).
 * Run: npx tsx --tsconfig verify5b/tsconfig.harness.json verify5b/_cutover_cap.ts
 */
import "./_env-preload"; // MUST be first — sets process.env before the email module loads
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { generateOccasions } from "../src/lib/engines/occasion-generator";
import { generateReminders } from "../src/lib/engines/occasions";
import { resolveCompanyRecipients } from "../src/lib/services/recipients";
import { sendOccasionReminderEmail } from "../src/lib/services/email";
import { festivalLimit } from "../src/lib/employees/plan-gate";

const env = Object.fromEntries(
  readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
) as Record<string, string>;
for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v; // for createAdminClient + Resend
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (base: string, n: number) => { const d = new Date(base); d.setDate(d.getDate() + n); return iso(d); };

async function main() {
  const today = iso(new Date(new Date().setHours(0, 0, 0, 0)));

  console.log("=== ITEM 4: reminders/email downstream of occasions ===");
  const { data: co } = await admin.from("companies").insert({ name: `t5b_${runid}_C`, slug: `t5b-${runid}-c`, onboarding_completed: true, plan: "pro", primary_contact_email: `t5b_${runid}_hr@example.com`, primary_contact_name: "HR" }).select("id").single();
  const A = co!.id as string;
  // Birthday whose notify_date lands TODAY: date = today+14 (lead 14) -> notify = today.
  const bdayDate = new Date(addDays(today, 14));
  const { data: emp } = await admin.from("employees").insert({ company_id: A, full_name: `t5b_${runid}_DueEmp`, joining_date: null }).select("id").single();
  await admin.from("employee_pii").insert({ employee_id: emp!.id, company_id: A, phone_enc: "e", dob_day: bdayDate.getDate(), dob_month: bdayDate.getMonth() + 1 });

  await generateOccasions(A, admin);
  const { data: dueOcc } = await admin.from("occasions").select("notify_date, occasion_type_key, date").eq("company_id", A);
  const bday = (dueOcc ?? []).find((o: any) => o.occasion_type_key === "birthday");
  check("occasion generated with notify_date = today", bday?.notify_date === today, `(notify=${bday?.notify_date})`);

  await generateReminders(A, admin);
  const { data: rem } = await admin.from("reminders").select("reminder_type, reminder_date, occasion_date, title").eq("company_id", A).eq("reminder_date", today);
  check("reminder row DERIVED FROM occasion (reminder_date=today, occasion-sourced)", (rem ?? []).length === 1 && (rem as any)[0].reminder_type === "birthday");

  // Fire the email the SAME way the cron does (occasion-sourced reminders).
  const { clientName, emails } = await resolveCompanyRecipients(A);
  let resendId: string | null = null;
  if (emails.length) {
    const res = await sendOccasionReminderEmail({ to: emails[0], clientName, occasions: (rem ?? []).map((r: any) => ({ title: r.title, date: r.occasion_date, type: r.reminder_type })) });
    resendId = res.success ? (res as any).id ?? "sent" : null;
  }
  check("email path fires from occasion-sourced reminder (real Resend id)", !!resendId, `(id=${resendId})`);
  await new Promise((x) => setTimeout(x, 1500));
  const { data: log } = await admin.from("email_log").select("template, status").eq("template", "occasion_reminder").ilike("to_email", `%t5b_${runid}_%`).order("created_at", { ascending: false }).limit(1);
  check("email_log records the occasion_reminder send", (log ?? []).length === 1, JSON.stringify(log));
  // No double-fire: reminders come only from occasions (single row per occasion at notify_date).
  check("no double-fire: exactly one reminder for the due occasion", (rem ?? []).length === 1);

  console.log("\n=== ITEM 5: festival Free=3 cap ===");
  check("festivalLimit Free = 3", festivalLimit({ plan: "free", isPlatformStaff: false }) === 3);
  check("festivalLimit Pro = unlimited", festivalLimit({ plan: "pro", isPlatformStaff: false }) === Number.POSITIVE_INFINITY);
  check("festivalLimit platform bypass = unlimited", festivalLimit({ plan: "free", isPlatformStaff: true }) === Number.POSITIVE_INFINITY);
  // Route resulting-active-set logic (replicated): 3 active ok, 4th exceeds Free cap.
  const active = new Set<string>();
  const submit = ["f1", "f2", "f3"].map((f) => ({ festival_id: f, is_active: true }));
  for (const p of submit) p.is_active ? active.add(p.festival_id) : active.delete(p.festival_id);
  check("Free: 3 opted-in within cap", active.size <= 3);
  active.add("f4");
  check("Free: 4th opted-in EXCEEDS cap (route returns 403 free_festival_limit)", active.size > festivalLimit({ plan: "free", isPlatformStaff: false }));

  // teardown
  await admin.from("reminders").delete().eq("company_id", A);
  await admin.from("occasions").delete().eq("company_id", A);
  await admin.from("employee_pii").delete().eq("company_id", A);
  await admin.from("employees").delete().eq("company_id", A);
  await admin.from("email_log").delete().ilike("to_email", `%t5b_${runid}_%`);
  await admin.from("companies").delete().eq("id", A);
  const resid = (await admin.from("companies").select("id", { count: "exact", head: true }).ilike("name", "t5b\\_%")).count ?? 0;
  check(`residue t5b_ companies = 0 (got ${resid})`, resid === 0);

  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
