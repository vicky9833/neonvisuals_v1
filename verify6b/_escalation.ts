import "./_env-preload";
/**
 * 6b item 2 — §7 escalation ladder. Stage 2 (half-lead, no gift) + Stage 3 (T-3, no gift);
 * SUPPRESSED when a gift is chosen; per-stage dedupe (idempotent scan); correct audiences.
 * Run: npx tsx --tsconfig verify6b/tsconfig.harness.json verify6b/_escalation.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { runOccasionEscalation, stableOccasionKey, NOTIFICATION_TYPES } from "../src/lib/engines/notifications";

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
  const { data: co } = await admin.from("companies").insert({ name: `t6b_${runid}_E`, slug: `t6b-${runid}-e`, onboarding_completed: true, plan: "pro", primary_contact_phone: "9876500066" }).select("id").single();
  const A = co!.id as string;
  const owner = await mkUser("owner"), adminU = await mkUser("admin"), hr = await mkUser("hr"), platAdmin = await mkUser("platadmin"), platOwner = await mkUser("platowner");
  await admin.from("company_members").insert([
    { company_id: A, user_id: owner, role: "org_owner", status: "active" },
    { company_id: A, user_id: adminU, role: "org_admin", status: "active" },
    { company_id: A, user_id: hr, role: "hr", status: "active" },
  ]);
  await admin.from("platform_staff").insert([{ user_id: platAdmin, role: "admin" }, { user_id: platOwner, role: "owner" }]);
  const mk = async (tag: string) => (await admin.from("employees").insert({ company_id: A, full_name: `${SENT} ${tag}`, joining_date: null }).select("id").single()).data!.id as string;
  const empA = await mk("A"), empB = await mk("B"), empC = await mk("C");
  const company = { name: `t6b_${runid}_E`, plan: "pro", primary_contact_name: "C", primary_contact_phone: "9876500066" };

  // occA: date today+5, lead 14 -> stage2Date=occ-7=today-2 (fires), stage3Date=occ-3=today+2 (not yet).
  const occA = { id: "a1", company_id: A, employee_id: empA, occasion_type_key: "birthday", title: `${SENT} A's Birthday`, date: addDays(5), lead_days: 14 };
  // occB: date today+2, lead 14 -> stage3Date=today-1 (fires), stage2 also fires (catch-up).
  const occB = { id: "b1", company_id: A, employee_id: empB, occasion_type_key: "birthday", title: `${SENT} B's Birthday`, date: addDays(2), lead_days: 14 };
  // occC: date today+5, WITH gift-state -> suppressed.
  const occC = { id: "c1", company_id: A, employee_id: empC, occasion_type_key: "birthday", title: `${SENT} C's Birthday`, date: addDays(5), lead_days: 14 };
  await admin.from("occasion_gift_state").insert({ stable_key: stableOccasionKey(occC), company_id: A, employee_id: empC, occasion_type_key: "birthday", occasion_date: occC.date, status: "chosen" });

  const rA = await runOccasionEscalation(admin, occA, company, today);
  const rB = await runOccasionEscalation(admin, occB, company, today);
  const rC = await runOccasionEscalation(admin, occC, company, today);

  const { data: notifs } = await admin.from("notifications").select("recipient_user_id, type, title, body, link, dedupe_key").eq("company_id", A);
  const byKey = (k: string) => (notifs ?? []).filter((n: any) => n.dedupe_key === k);
  const recips = (k: string) => byKey(k).map((n: any) => n.recipient_user_id);
  const kA = stableOccasionKey(occA), kB = stableOccasionKey(occB), kC = stableOccasionKey(occC);

  console.log("=== ITEM 2: escalation fires when NO gift chosen ===");
  check("occA stage2 fired, stage3 NOT", rA.stage2Fired && !rA.stage3Fired, JSON.stringify(rA));
  check("occA stage2 tenant audience = {hr, org_admin}", recips(`occ-esc:${kA}:2`).sort().join() === [hr, adminU].sort().join(), JSON.stringify(recips(`occ-esc:${kA}:2`)));
  check("occA stage2 platform audience includes platform_admin", recips(`occ-escops:${kA}:2`).includes(platAdmin));
  check("occA NO stage3 notifications", byKey(`occ-esc:${kA}:3`).length === 0);

  check("occB stage3 fired", rB.stage3Fired, JSON.stringify(rB));
  check("occB stage3 tenant audience = {hr, org_owner}", recips(`occ-esc:${kB}:3`).sort().join() === [hr, owner].sort().join(), JSON.stringify(recips(`occ-esc:${kB}:3`)));
  check("occB stage3 platform audience includes platform_owner", recips(`occ-escops:${kB}:3`).includes(platOwner));

  console.log("\n=== ITEM 2: SUPPRESSED when gift chosen (the whole point) ===");
  check("occC suppressed (gift-state present)", rC.suppressed && !rC.stage2Fired && !rC.stage3Fired, JSON.stringify(rC));
  check("occC has ZERO escalation notifications", (notifs ?? []).filter((n: any) => (n.dedupe_key ?? "").includes(kC)).length === 0);

  console.log("\n=== ITEM 2: per-stage dedupe (idempotent scan) ===");
  const before = byKey(`occ-esc:${kA}:2`).length;
  await runOccasionEscalation(admin, occA, company, today); // second scan same day
  const after = byKey(`occ-esc:${kA}:2`).length;
  const { data: notifs2 } = await admin.from("notifications").select("dedupe_key").eq("company_id", A).eq("dedupe_key", `occ-esc:${kA}:2`);
  check("re-running escalation does NOT re-fire stage2 (dedupe)", (notifs2 ?? []).length === before && before > 0, `before=${before}, now=${(notifs2 ?? []).length}`);

  console.log("\n=== ITEM 2: PII-safe (§10.13) titles/links ===");
  const titles = (notifs ?? []).map((n: any) => n.title);
  const links = (notifs ?? []).map((n: any) => n.link).filter(Boolean);
  check("ZERO employee name in escalation TITLES", !titles.some((t: string) => t.includes(SENT)), JSON.stringify(titles.slice(0, 4)));
  check("ZERO employee name in escalation LINKS", !links.some((l: string) => l.includes(SENT)));
  const platBodies = (notifs ?? []).filter((n: any) => n.type === NOTIFICATION_TYPES.OCCASION_ESCALATION_OPS).map((n: any) => n.body);
  check("platform escalation bodies PII-free", !platBodies.some((b: string) => b?.includes(SENT)));
  const tenantBodies = (notifs ?? []).filter((n: any) => n.type === NOTIFICATION_TYPES.OCCASION_ESCALATION).map((n: any) => n.body);
  check("tenant escalation body names person (authorised) — non-vacuous", tenantBodies.some((b: string) => b?.includes(SENT)));

  // teardown
  await admin.from("notifications").delete().eq("company_id", A);
  await admin.from("occasion_gift_state").delete().eq("company_id", A);
  await admin.from("platform_staff").delete().in("user_id", [platAdmin, platOwner]);
  await admin.from("employees").delete().eq("company_id", A);
  await admin.from("company_members").delete().eq("company_id", A).neq("role", "org_owner");
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
