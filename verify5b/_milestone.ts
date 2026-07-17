/**
 * Prompt 5b — MILESTONE SUPPRESSION (ruling): at a milestone year {5,10,15,20} the premium
 * milestone_anniversary REPLACES the plain work_anniversary (no double-gift). Non-milestone
 * years (e.g. 3) keep the plain work_anniversary and get NO milestone.
 * Run: npx tsx --tsconfig verify5b/tsconfig.harness.json verify5b/_milestone.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
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
const addDays = (base: string, n: number) => { const d = new Date(base); d.setDate(d.getDate() + n); return iso(d); };

async function main() {
  const today = iso(new Date(new Date().setHours(0, 0, 0, 0)));
  // Anniversary ~30 days out (upcoming this year) so year-count = today.year - joinYear.
  const annivMMDD = addDays(today, 30);
  const mm = annivMMDD.slice(5); // "MM-DD"
  const y = new Date(today).getFullYear();
  const join10 = `${y - 10}-${mm}`; // next anniversary is the 10-year (milestone)
  const join3 = `${y - 3}-${mm}`;   // next anniversary is the 3-year (NOT a milestone)

  const { data: co } = await admin.from("companies").insert({ name: `t5b_${runid}_M`, slug: `t5b-${runid}-m`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const A = co!.id as string;
  const { data: emps } = await admin.from("employees").insert([
    { company_id: A, full_name: `t5b_${runid}_Ten`, joining_date: join10 },
    { company_id: A, full_name: `t5b_${runid}_Three`, joining_date: join3 },
  ]).select("id, full_name");
  const ten = emps!.find((e) => e.full_name.endsWith("Ten"))!.id as string;
  const three = emps!.find((e) => e.full_name.endsWith("Three"))!.id as string;
  // no PII/dob -> no birthday noise; isolate anniversary vs milestone.

  await generateOccasions(A, admin);
  const { data: occs } = await admin.from("occasions").select("employee_id, occasion_type_key, date, lead_days").eq("company_id", A);
  const rowsFor = (id: string) => (occs ?? []).filter((o: any) => o.employee_id === id);

  console.log("=== 10-YEAR EMPLOYEE (milestone year) ===");
  const tenRows = rowsFor(ten);
  const tenTypes = tenRows.map((o: any) => o.occasion_type_key).sort();
  console.log("  types:", JSON.stringify(tenTypes));
  check("10-yr: milestone_anniversary PRESENT", tenTypes.includes("milestone_anniversary"));
  check("10-yr: plain work_anniversary SUPPRESSED (not present)", !tenTypes.includes("work_anniversary"));
  check("10-yr: exactly ONE anniversary-family occasion (no double-gift)", tenRows.filter((o: any) => o.occasion_type_key === "milestone_anniversary" || o.occasion_type_key === "work_anniversary").length === 1);
  const mile = tenRows.find((o: any) => o.occasion_type_key === "milestone_anniversary");
  check("10-yr: milestone on the same anniversary date, lead 30", mile?.date === annivMMDD && mile?.lead_days === 30, `(date=${mile?.date}, lead=${mile?.lead_days})`);

  console.log("\n=== 3-YEAR EMPLOYEE (non-milestone year) ===");
  const threeRows = rowsFor(three);
  const threeTypes = threeRows.map((o: any) => o.occasion_type_key).sort();
  console.log("  types:", JSON.stringify(threeTypes));
  check("3-yr: plain work_anniversary PRESENT", threeTypes.includes("work_anniversary"));
  check("3-yr: NO milestone_anniversary", !threeTypes.includes("milestone_anniversary"));
  check("3-yr: exactly ONE anniversary-family occasion", threeRows.filter((o: any) => o.occasion_type_key === "milestone_anniversary" || o.occasion_type_key === "work_anniversary").length === 1);
  const wa = threeRows.find((o: any) => o.occasion_type_key === "work_anniversary");
  check("3-yr: work_anniversary lead 14 (regular)", wa?.lead_days === 14, `(lead=${wa?.lead_days})`);

  // teardown
  await admin.from("occasions").delete().eq("company_id", A);
  await admin.from("employees").delete().eq("company_id", A);
  await admin.from("companies").delete().eq("id", A);
  const resid = (await admin.from("companies").select("id", { count: "exact", head: true }).ilike("name", "t5b\\_%")).count ?? 0;
  check(`residue t5b_ companies = 0 (got ${resid})`, resid === 0);

  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
