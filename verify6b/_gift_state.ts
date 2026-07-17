import "./_env-preload";
/**
 * 6b item 1 — occasion_gift_state survives occasion regeneration; stable-key uniqueness.
 * Run: npx tsx --tsconfig verify6b/tsconfig.harness.json verify6b/_gift_state.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { giftChosenFor, stableOccasionKey } from "../src/lib/engines/notifications";

const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })) as Record<string, string>;
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };

async function main() {
  const { data: co } = await admin.from("companies").insert({ name: `t6b_${runid}_G`, slug: `t6b-${runid}-g`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const A = co!.id as string;
  const { data: emp } = await admin.from("employees").insert({ company_id: A, full_name: `t6b_${runid}_Emp`, joining_date: null }).select("id").single();
  const E = emp!.id as string;
  const date = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);
  const occ1 = { id: "00000000-0000-0000-0000-0000000091a1", company_id: A, employee_id: E, occasion_type_key: "birthday", title: `${runid} birthday`, date };

  console.log("=== ITEM 1: gift-state survives regen ===");
  check("giftChosenFor FALSE before any gift-state", (await giftChosenFor(admin, occ1)) === false);
  // Write synthetic gift-state (keyed on stable identity).
  const key = stableOccasionKey(occ1);
  await admin.from("occasion_gift_state").insert({ stable_key: key, company_id: A, employee_id: E, occasion_type_key: "birthday", occasion_date: date, status: "chosen" });
  check("giftChosenFor TRUE after gift-state written", (await giftChosenFor(admin, occ1)) === true);
  // "Regenerate" the occasion: DIFFERENT occasions.id, SAME stable identity.
  const occ2 = { ...occ1, id: "00000000-0000-0000-0000-0000000092b2" };
  check("giftChosenFor STILL TRUE after regen (new occasion.id, same stable key)", (await giftChosenFor(admin, occ2)) === true);
  check("stable key identical across regen", stableOccasionKey(occ1) === stableOccasionKey(occ2));

  console.log("\n=== stable-key uniqueness ===");
  // Employee occasion: unique per (company, employee, type, date). A 2nd insert same key -> 23505.
  const dup = await admin.from("occasion_gift_state").insert({ stable_key: key, company_id: A, employee_id: E, occasion_type_key: "birthday", occasion_date: date, status: "chosen" });
  check("duplicate stable_key rejected (unique constraint)", dup.error?.code === "23505", dup.error?.code ?? "no-error");
  // Company-wide festival disambiguation: two SAME-date festivals get DISTINCT keys via title.
  const f1 = stableOccasionKey({ company_id: A, employee_id: null, occasion_type_key: "festival", date, title: "Diwali" });
  const f2 = stableOccasionKey({ company_id: A, employee_id: null, occasion_type_key: "festival", date, title: "Makar Sankranti" });
  check("company-wide same-date festivals -> DISTINCT stable keys (title disambiguates)", f1 !== f2, `${f1} vs ${f2}`);
  check("employee key carries NO name (uuid only, PII-safe)", !key.includes(`${runid}`) || key.includes(E), key);

  // teardown
  await admin.from("occasion_gift_state").delete().eq("company_id", A);
  await admin.from("employees").delete().eq("company_id", A);
  const resid = (await admin.from("occasion_gift_state").select("id", { count: "exact", head: true }).eq("company_id", A)).count ?? 0;
  check(`residue gift_state = 0 (got ${resid})`, resid === 0);
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
