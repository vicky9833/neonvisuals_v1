/**
 * Prompt 5b item 1 — EQUIVALENCE GATE. On identical synthetic fixtures, the NEW engine's
 * SHARED-type occasion set (birthday/work_anniversary/festival/custom) must equal the OLD
 * engine's (occasions.getCalendarEvents) — no drop, no invent — PLUS carry lead_days/notify_date.
 * The §4A additions (milestone/onboarding/probation) are reported separately (the intended PLUS).
 * Run: npx tsx --tsconfig verify5b/tsconfig.harness.json verify5b/_equivalence.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { getCalendarEvents } from "../src/lib/engines/occasions";
import { generateOccasions } from "../src/lib/engines/occasion-generator";

const env = Object.fromEntries(
  readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
) as Record<string, string>;
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function addDays(base: string, n: number) { const d = new Date(base); d.setDate(d.getDate() + n); return iso(d); }

async function main() {
  const today = iso(new Date(new Date().setHours(0, 0, 0, 0)));
  const end = addDays(today, 365);

  const { data: co } = await admin.from("companies").insert({ name: `t5b_${runid}_A`, slug: `t5b-${runid}-a`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const A = co!.id as string;
  const { data: emps } = await admin.from("employees").insert([
    { company_id: A, full_name: `t5b_${runid}_Alice`, joining_date: "2020-03-01" },
    { company_id: A, full_name: `t5b_${runid}_Bob`, joining_date: null },
    { company_id: A, full_name: `t5b_${runid}_Cara`, joining_date: "2024-08-01" },
  ]).select("id, full_name");
  const alice = emps!.find((e) => e.full_name.endsWith("Alice"))!.id as string;
  const bob = emps!.find((e) => e.full_name.endsWith("Bob"))!.id as string;
  const cara = emps!.find((e) => e.full_name.endsWith("Cara"))!.id as string;
  await admin.from("employee_pii").insert([
    { employee_id: alice, company_id: A, phone_enc: "enc", dob_day: 15, dob_month: 6 },
    { employee_id: bob, company_id: A, phone_enc: "enc", dob_day: 25, dob_month: 12 },
    { employee_id: cara, company_id: A, phone_enc: "enc", dob_day: 10, dob_month: 1 },
  ]);
  await admin.from("custom_occasions").insert({ company_id: A, title: `t5b_${runid}_TownHall`, occasion_date: addDays(today, 40), recurrence: "none", occasion_type: "custom", is_active: true });

  // OLD engine set (shared types).
  const oldEvents = await getCalendarEvents(A, today, end, admin);
  const sharedTypes = new Set(["birthday", "work_anniversary", "festival", "custom"]);
  const oldSet = new Set(oldEvents.filter((e) => sharedTypes.has(e.type)).map((e) => `${e.type}|${e.title}|${e.date}`));

  // NEW engine.
  const gen = await generateOccasions(A, admin);
  const { data: occ } = await admin.from("occasions").select("occasion_type_key, title, date, lead_days, notify_date").eq("company_id", A);
  const keyToType: Record<string, string> = { birthday: "birthday", work_anniversary: "work_anniversary", festival: "festival", custom: "custom" };
  const newShared = (occ ?? []).filter((o: any) => o.occasion_type_key in keyToType);
  const newSet = new Set(newShared.map((o: any) => `${keyToType[o.occasion_type_key]}|${o.title}|${o.date}`));
  const newExtra = (occ ?? []).filter((o: any) => !(o.occasion_type_key in keyToType));

  console.log("=== EQUIVALENCE (shared types: birthday/work_anniversary/festival/custom) ===");
  console.log(`  old shared events: ${oldSet.size} · new shared occasions: ${newSet.size}`);
  const dropped = [...oldSet].filter((k) => !newSet.has(k)); // in old, not in new
  const invented = [...newSet].filter((k) => !oldSet.has(k)); // in new, not in old
  check(`no occasion DROPPED (old ⊆ new), dropped=${dropped.length}`, dropped.length === 0);
  if (dropped.length) console.log("    DROPPED:", dropped.slice(0, 10));
  check(`no occasion INVENTED (new ⊆ old), invented=${invented.length}`, invented.length === 0);
  if (invented.length) console.log("    INVENTED:", invented.slice(0, 10));
  check("shared occasion SET matches exactly (new == old)", dropped.length === 0 && invented.length === 0);

  console.log("\n=== NEW ENGINE ADDITIONS (the intended PLUS) ===");
  const extraByType = newExtra.reduce((m: Record<string, number>, o: any) => { m[o.occasion_type_key] = (m[o.occasion_type_key] ?? 0) + 1; return m; }, {});
  console.log("  additive types:", JSON.stringify(extraByType), "| missing joining_date:", gen.missingJoiningDate);

  console.log("\n=== NEW ENGINE carries lead_days + notify_date ===");
  const allHaveLead = (occ ?? []).every((o: any) => typeof o.lead_days === "number" && !!o.notify_date);
  check("every generated occasion has lead_days + notify_date", allHaveLead);
  const bday = (occ ?? []).find((o: any) => o.occasion_type_key === "birthday");
  if (bday) check(`birthday lead_days=14 + notify_date computed`, bday.lead_days === 14 && !!bday.notify_date, `(lead=${bday.lead_days})`);

  // teardown (no members -> no guard).
  await admin.from("occasions").delete().eq("company_id", A);
  await admin.from("custom_occasions").delete().eq("company_id", A);
  await admin.from("employee_pii").delete().eq("company_id", A);
  await admin.from("employees").delete().eq("company_id", A);
  await admin.from("companies").delete().eq("id", A);
  const resid = (await admin.from("companies").select("id", { count: "exact", head: true }).ilike("name", "t5b\\_%")).count ?? 0;
  check(`residue t5b_ companies = 0 (got ${resid})`, resid === 0);

  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
