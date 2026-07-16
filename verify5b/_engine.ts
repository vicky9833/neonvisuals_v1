/**
 * Prompt 5b items 2 (null-DOJ / onboarding sign / year-agnostic birthday) + 3 (blackout skip / rush).
 * Run: npx tsx --tsconfig verify5b/tsconfig.harness.json verify5b/_engine.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { generateOccasions, computeNotify } from "../src/lib/engines/occasion-generator";

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

  console.log("=== ITEM 3a: computeNotify blackout-skip (pure) ===");
  // occasion in 30 days, lead 10, no blackout -> notify = occasion - 10.
  const occ = addDays(today, 30);
  const plain = computeNotify(occ, 10, new Set(), today);
  check("no blackout: notify = occasion - 10 calendar days", plain.notify === addDays(occ, -10));
  // blackout on 3 of the days in the lead window -> notify pushed 3 days earlier.
  const bl = new Set<string>([addDays(occ, -1), addDays(occ, -2), addDays(occ, -3)]);
  const skipped = computeNotify(occ, 10, bl, today);
  check("blackout skip: notify pushed earlier by the 3 blackout days", skipped.notify === addDays(occ, -13), `(notify=${skipped.notify}, expect ${addDays(occ, -13)})`);
  check("normal occasion: not rush", plain.rush === false);
  // occasion in 3 days, lead 14 -> notify in the past -> rush.
  const rushCalc = computeNotify(addDays(today, 3), 14, new Set(), today);
  check("occasion inside its lead window -> rush=true", rushCalc.rush === true);

  // ---- fixtures for generator-level edges ----
  const { data: co } = await admin.from("companies").insert({ name: `t5b_${runid}_E`, slug: `t5b-${runid}-e`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const A = co!.id as string;
  const joinFuture = addDays(today, 20);
  // dob a few days out (soon birthday -> rush with lead 14)
  const soon = new Date(addDays(today, 3));
  const { data: emps } = await admin.from("employees").insert([
    { company_id: A, full_name: `t5b_${runid}_Future`, joining_date: joinFuture },
    { company_id: A, full_name: `t5b_${runid}_NoJoin`, joining_date: null },
    { company_id: A, full_name: `t5b_${runid}_Soon`, joining_date: null },
  ]).select("id, full_name");
  const fut = emps!.find((e) => e.full_name.endsWith("Future"))!.id as string;
  const noj = emps!.find((e) => e.full_name.endsWith("NoJoin"))!.id as string;
  const soonId = emps!.find((e) => e.full_name.endsWith("Soon"))!.id as string;
  await admin.from("employee_pii").insert([
    { employee_id: fut, company_id: A, phone_enc: "e", dob_day: 20, dob_month: 3 },
    { employee_id: noj, company_id: A, phone_enc: "e", dob_day: 10, dob_month: 1 }, // Jan 10 -> next year
    { employee_id: soonId, company_id: A, phone_enc: "e", dob_day: soon.getDate(), dob_month: soon.getMonth() + 1 },
  ]);

  const gen = await generateOccasions(A, admin);
  const { data: occs } = await admin.from("occasions").select("employee_id, occasion_type_key, date, notify_date, is_rush").eq("company_id", A);
  const rowsFor = (empId: string) => (occs ?? []).filter((o: any) => o.employee_id === empId);

  console.log("\n=== ITEM 2: null joining_date + onboarding sign + year-agnostic birthday ===");
  const nojRows = rowsFor(noj);
  check("null-joining employee -> birthday ONLY (no anniv/onboarding/probation/milestone)", nojRows.length === 1 && nojRows[0].occasion_type_key === "birthday");
  check("null joining_date counted in missing surface", gen.missingJoiningDate >= 1, `(missing=${gen.missingJoiningDate})`);
  // year-agnostic birthday across year boundary: Jan 10, today mid-year -> next year's Jan 10.
  const nojBday = nojRows.find((o: any) => o.occasion_type_key === "birthday");
  const expectYear = new Date(today) > new Date(`${new Date(today).getFullYear()}-01-10`) ? new Date(today).getFullYear() + 1 : new Date(today).getFullYear();
  check("year-agnostic birthday next-occurrence crosses year boundary", nojBday?.date === `${expectYear}-01-10`, `(date=${nojBday?.date})`);
  // onboarding sign: notify = joining - 5 (no blackout).
  const onb = rowsFor(fut).find((o: any) => o.occasion_type_key === "onboarding");
  check("onboarding present for future joiner", !!onb);
  check("onboarding notify_date = joining_date - 5 (BEFORE joining, not after)", onb?.notify_date === addDays(joinFuture, -5) && (onb?.notify_date as string) < joinFuture, `(notify=${onb?.notify_date}, join=${joinFuture})`);

  console.log("\n=== ITEM 3b: rush state on a near-date occasion (generator) ===");
  const soonBday = rowsFor(soonId).find((o: any) => o.occasion_type_key === "birthday");
  check("soon birthday (lead 14, ~3 days out) marked is_rush=true", soonBday?.is_rush === true);
  check("future onboarding (notify in ~15 days) NOT rush", onb?.is_rush === false);

  // teardown
  await admin.from("occasions").delete().eq("company_id", A);
  await admin.from("employee_pii").delete().eq("company_id", A);
  await admin.from("employees").delete().eq("company_id", A);
  await admin.from("companies").delete().eq("id", A);
  const resid = (await admin.from("companies").select("id", { count: "exact", head: true }).ilike("name", "t5b\\_%")).count ?? 0;
  check(`residue t5b_ companies = 0 (got ${resid})`, resid === 0);

  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
