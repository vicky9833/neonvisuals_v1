import "./_env-preload";
/**
 * 6a item 5 — §10.13 adversarial PII safety. An employee with SENTINEL PII flows through the
 * occasion + membership triggers. Assert the sentinels NEVER appear in any email SUBJECT,
 * notification TITLE, or notification LINK (URL/log surfaces). Bodies MAY name the person for the
 * authorised tenant audience (RLS-gated) — that is not a subject/log leak. A control proves the
 * grep catches a real leak.
 * Run: npx tsx --tsconfig verify6a/tsconfig.harness.json verify6a/_pii_safe.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { notify, notifyOccasionAtLeadTime, NOTIFICATION_TYPES } from "../src/lib/engines/notifications";

const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })) as Record<string, string>;
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };
async function mkUser(tag: string) { const { data } = await admin.auth.admin.createUser({ email: `t6a_${runid}_${tag}@example.com`, password: `T6a!${runid}!pw`, email_confirm: true }); return data!.user.id; }

// SENTINELS (employee PII that must never hit a subject/title/link).
const NAME = "Zzsentinelfirst Zzsentinellast";
const PHONE = "9111100077";
const SENTINELS = ["Zzsentinelfirst", "Zzsentinellast", PHONE];
const containsSentinel = (s: string | null | undefined) => !!s && SENTINELS.some((t) => s.includes(t));

async function main() {
  const { data: co } = await admin.from("companies").insert({ name: `t6a_${runid}_Pii`, slug: `t6a-${runid}-pii`, onboarding_completed: true, plan: "pro", primary_contact_name: "Biz Contact", primary_contact_phone: "9876500033" }).select("id").single();
  const A = co!.id as string;
  const hr = await mkUser("hr"), plat = await mkUser("plat");
  await admin.from("company_members").insert({ company_id: A, user_id: hr, role: "hr", status: "active" });
  await admin.from("platform_staff").insert({ user_id: plat, role: "admin" });
  const { data: emp } = await admin.from("employees").insert({ company_id: A, full_name: NAME, joining_date: null }).select("id").single();
  const E = emp!.id as string;
  await admin.from("employee_pii").insert({ employee_id: E, company_id: A, phone_enc: "enc", dob_day: 12, dob_month: 8 });

  // Fire the occasion trigger (occasion.title CONTAINS the sentinel name — the real risk vector).
  await notifyOccasionAtLeadTime(admin, {
    id: "00000000-0000-0000-0000-0000000000cc", company_id: A, employee_id: E,
    occasion_type_key: "birthday", title: `${NAME}'s Birthday`, date: new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10),
  }, { name: `t6a_${runid}_Pii`, plan: "pro", primary_contact_name: "Biz Contact", primary_contact_phone: "9876500033" });

  // Fire an engine EMAIL (reference-style subject) to exercise the email subject path with PII in scope.
  await notify(admin, {
    type: NOTIFICATION_TYPES.OCCASION_REMINDER, audience: [{ plane: "tenant", role: "hr" }], companyId: A,
    title: "Upcoming birthday reminder", body: `${NAME}'s birthday is coming up.`, link: "/dashboard/occasions",
    email: { subject: "Upcoming gifting moment this week", html: `<p>${NAME}</p>`, template: `t6a_${runid}_pii` },
  });

  const { data: notifs } = await admin.from("notifications").select("type, title, body, link").eq("company_id", A);
  const { data: emails } = await admin.from("email_log").select("subject, metadata").eq("template", `t6a_${runid}_pii`);

  console.log("=== ITEM 5: §10.13 adversarial PII safety ===");
  const titles = (notifs ?? []).map((n: any) => n.title);
  const links = (notifs ?? []).map((n: any) => n.link).filter(Boolean);
  const subjects = (emails ?? []).map((e: any) => e.subject);
  const metas = (emails ?? []).map((e: any) => JSON.stringify(e.metadata ?? {}));

  check("NO sentinel in any notification TITLE", !titles.some(containsSentinel), JSON.stringify(titles));
  check("NO sentinel in any notification LINK (URL/log surface)", !links.some(containsSentinel));
  check("NO sentinel in any email SUBJECT", !subjects.some(containsSentinel), JSON.stringify(subjects));
  check("NO sentinel in logged email metadata", !metas.some(containsSentinel));
  // Platform notification must be entirely PII-free (title+body+link).
  const platRows = (notifs ?? []).filter((n: any) => n.type === NOTIFICATION_TYPES.OCCASION_OPS);
  check("platform notification is fully PII-free (title+body+link)", platRows.every((n: any) => !containsSentinel(n.title) && !containsSentinel(n.body) && !containsSentinel(n.link)));
  // Tenant BODY is ALLOWED to name the person (RLS-gated authorised viewers) — prove it's there
  // (so we know the name flowed through and the title-cleanliness above is meaningful, not vacuous).
  const tenantBodies = (notifs ?? []).filter((n: any) => n.type === NOTIFICATION_TYPES.OCCASION_REMINDER).map((n: any) => n.body);
  check("tenant BODY names the person (authorised, RLS) — grep target present in scope", tenantBodies.some(containsSentinel));

  // CONTROL: the grep MUST catch a real leak.
  check("CONTROL: grep catches a deliberately-leaked title", containsSentinel(`${NAME}'s Birthday`) === true);

  // teardown
  await admin.from("notifications").delete().eq("company_id", A);
  await admin.from("email_log").delete().eq("template", `t6a_${runid}_pii`);
  await admin.from("employee_pii").delete().eq("company_id", A);
  await admin.from("employees").delete().eq("company_id", A);
  await admin.from("platform_staff").delete().eq("user_id", plat);
  await admin.from("company_members").delete().eq("company_id", A);
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
