import "./_env-preload";
/**
 * 6a item 4 — fireable-now triggers through the engine.
 * Occasion-at-lead-time: tenant in-app (hr/org_admin/org_owner/dept-manager) + platform in-app,
 * wa.me ops link well-formed (and omitted when no client phone), and NO email from this path
 * (the company-contact email stays in the cron — no double-fire). Membership: role-change &
 * member-joined in-app to the right audiences.
 * Run: npx tsx --tsconfig verify6a/tsconfig.harness.json verify6a/_triggers.ts
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
const EMP_NAME = `Zzsentinel Personname`; // sentinel to prove it never lands in a title

async function main() {
  const { data: co } = await admin.from("companies").insert({ name: `t6a_${runid}_Acme`, slug: `t6a-${runid}-acme`, onboarding_completed: true, plan: "pro", primary_contact_name: "Contact Person", primary_contact_phone: "9876500022" }).select("id").single();
  const A = co!.id as string;
  const owner = await mkUser("owner"), adminU = await mkUser("admin"), hr = await mkUser("hr"), mgr = await mkUser("mgr"), plat = await mkUser("plat"), affected = await mkUser("affected");
  const { data: dept } = await admin.from("departments").insert({ company_id: A, name: `t6a_${runid}_Eng`, manager_id: mgr }).select("id").single();
  const D = dept!.id as string;
  await admin.from("company_members").insert([
    { company_id: A, user_id: owner, role: "org_owner", status: "active" },
    { company_id: A, user_id: adminU, role: "org_admin", status: "active" },
    { company_id: A, user_id: hr, role: "hr", status: "active" },
    { company_id: A, user_id: mgr, role: "manager", department_id: D, status: "active" },
    { company_id: A, user_id: affected, role: "viewer", status: "active" },
  ]);
  await admin.from("platform_staff").insert({ user_id: plat, role: "admin" });
  const { data: emp } = await admin.from("employees").insert({ company_id: A, full_name: EMP_NAME, joining_date: null, department_id: D }).select("id").single();
  const E = emp!.id as string;

  // ── Occasion-at-lead-time (birthday, dept-scoped via employee E) ──
  await notifyOccasionAtLeadTime(admin, {
    id: `00000000-0000-0000-0000-0000000000aa`, company_id: A, employee_id: E,
    occasion_type_key: "birthday", title: `${EMP_NAME}'s Birthday`, date: new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10),
  }, { name: `t6a_${runid}_Acme`, plan: "pro", primary_contact_name: "Contact Person", primary_contact_phone: "9876500022" });

  const { data: occNotifs } = await admin.from("notifications").select("recipient_user_id, type, title, body, link, channels_sent").eq("company_id", A);
  const tenantRecips = (occNotifs ?? []).filter((n: any) => n.type === NOTIFICATION_TYPES.OCCASION_REMINDER).map((n: any) => n.recipient_user_id);
  // platform_admin correctly resolves to ALL owner+admin staff (our test user + any real founder);
  // assert OUR test platform user received it. Teardown deletes by company_id=A (cleans all).
  const platNotif = (occNotifs ?? []).find((n: any) => n.type === NOTIFICATION_TYPES.OCCASION_OPS && n.recipient_user_id === plat);

  console.log("=== ITEM 4: occasion-at-lead-time ===");
  check("tenant in-app to hr, org_admin, org_owner, dept-manager (4 recips)", [owner, adminU, hr, mgr].every((u) => tenantRecips.includes(u)) && tenantRecips.length === 4, JSON.stringify(tenantRecips.length));
  check("platform in-app (occasion_ops) to platform admin", !!platNotif && platNotif.recipient_user_id === plat);
  check("tenant TITLE is reference-style (no employee name)", (occNotifs ?? []).filter((n: any) => n.type === NOTIFICATION_TYPES.OCCASION_REMINDER).every((n: any) => !n.title.includes("Zzsentinel")));
  check("tenant BODY may name the employee (authorised)", (occNotifs ?? []).some((n: any) => n.type === NOTIFICATION_TYPES.OCCASION_REMINDER && (n.body ?? "").includes(EMP_NAME)));
  check("platform BODY has NO employee name (PII-safe)", !(platNotif?.body ?? "").includes("Zzsentinel"));
  check("platform link is a well-formed wa.me with client phone + NO employee name", typeof platNotif?.link === "string" && platNotif.link.includes("wa.me/919876500022") && !platNotif.link.includes("Zzsentinel"), platNotif?.link);
  // No double-fire: the occasion in-app path passes NO email spec, so channels_sent is in_app only.
  const allChannels = (occNotifs ?? []).flatMap((n: any) => n.channels_sent ?? []);
  check("occasion in-app path fired NO email (channels_sent = in_app only; cron owns the email)", allChannels.length > 0 && allChannels.every((ch: string) => ch === "in_app"), JSON.stringify([...new Set(allChannels)]));

  // wa.me omitted when client has no phone.
  await admin.from("notifications").delete().eq("company_id", A);
  await notifyOccasionAtLeadTime(admin, {
    id: `00000000-0000-0000-0000-0000000000bb`, company_id: A, employee_id: null,
    occasion_type_key: "festival", title: `Diwali`, date: new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
  }, { name: `t6a_${runid}_Acme`, plan: "pro", primary_contact_name: null, primary_contact_phone: null });
  const { data: noPhone } = await admin.from("notifications").select("link, type").eq("company_id", A).eq("type", NOTIFICATION_TYPES.OCCASION_OPS).maybeSingle();
  check("wa.me link omitted (null) when client has no phone", (noPhone as any)?.link == null);

  // ── Membership: role-change (affected + owner) & member-joined (owner/admin) ──
  await admin.from("notifications").delete().eq("company_id", A);
  await notify(admin, { type: NOTIFICATION_TYPES.MEMBER_ROLE_CHANGED, audience: [{ plane: "tenant", role: "org_owner" }], recipients: [affected], companyId: A, title: "Team role updated", body: "A team member's role was changed to hr.", link: "/dashboard/team" });
  const { data: rc } = await admin.from("notifications").select("recipient_user_id").eq("company_id", A).eq("type", NOTIFICATION_TYPES.MEMBER_ROLE_CHANGED);
  console.log("\n=== ITEM 4: membership in-app ===");
  check("role-change in-app -> affected user + org_owner", (rc ?? []).length === 2 && (rc ?? []).some((n: any) => n.recipient_user_id === affected) && (rc ?? []).some((n: any) => n.recipient_user_id === owner));
  await admin.from("notifications").delete().eq("company_id", A);
  await notify(admin, { type: NOTIFICATION_TYPES.MEMBER_JOINED, audience: [{ plane: "tenant", role: "org_owner" }, { plane: "tenant", role: "org_admin" }], companyId: A, title: "New team member joined", body: "someone@example.com joined your team.", link: "/dashboard/team" });
  const { data: mj } = await admin.from("notifications").select("recipient_user_id").eq("company_id", A).eq("type", NOTIFICATION_TYPES.MEMBER_JOINED);
  check("member-joined in-app -> org_owner + org_admin", (mj ?? []).length === 2 && (mj ?? []).some((n: any) => n.recipient_user_id === owner) && (mj ?? []).some((n: any) => n.recipient_user_id === adminU));

  // teardown
  await admin.from("notifications").delete().eq("company_id", A);
  await admin.from("platform_staff").delete().eq("user_id", plat);
  await admin.from("employees").delete().eq("company_id", A);
  await admin.from("company_members").delete().eq("company_id", A).neq("role", "org_owner");
  await admin.from("departments").delete().eq("company_id", A);
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
