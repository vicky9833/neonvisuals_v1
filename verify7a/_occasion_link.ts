import "./_env-preload";
/**
 * 7a item 1 — stable occasion link on quotes matches occasion_gift_state's key; org_id standardized.
 * Run: npx tsx --tsconfig verify7a/tsconfig.harness.json verify7a/_occasion_link.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { requestQuote } from "../src/lib/engines/quote-request";
import { stableOccasionKey, giftChosenFor } from "../src/lib/engines/notifications";

const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })) as Record<string, string>;
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };

async function main() {
  const { data: co } = await admin.from("companies").insert({ name: `t7a_${runid}_L`, slug: `t7a-${runid}-l`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const A = co!.id as string;
  const { data: emp } = await admin.from("employees").insert({ company_id: A, full_name: `t7a_${runid}_Emp`, joining_date: null }).select("id").single();
  const E = emp!.id as string;
  const date = new Date(Date.now() + 20 * 86400_000).toISOString().slice(0, 10);
  const occasion = { employeeId: E, occasionTypeKey: "birthday", occasionDate: date, title: null };

  console.log("=== ITEM 1: stable occasion link on quotes ===");
  // requestQuote via admin as both clients (admin bypasses RLS; company-scoped insert still valid).
  const q = await requestQuote(admin, admin, { companyId: A, requestedBy: null as never, occasion, products: [{ sku: "TEST-SKU", quantity: 10 }], clientCompany: `t7a_${runid}_L` });
  const expectedKey = stableOccasionKey({ company_id: A, employee_id: E, occasion_type_key: "birthday", date });
  check("quote.occasion_key populated with the stable key", q.occasion_key === expectedKey, `${q.occasion_key}`);

  // The gift-state row shares the SAME key -> giftChosenFor joins.
  const { data: gs } = await admin.from("occasion_gift_state").select("stable_key, quote_id").eq("quote_id", q.id).maybeSingle();
  check("occasion_gift_state row shares the quote's stable key", gs?.stable_key === expectedKey && gs?.quote_id === q.id, `${gs?.stable_key}`);
  check("giftChosenFor(occasion) TRUE via the shared key (they JOIN)", (await giftChosenFor(admin, { company_id: A, employee_id: E, occasion_type_key: "birthday", date })) === true);

  // Quote row carries occasion_key column (not occasions.id).
  const { data: qrow } = await admin.from("quotes").select("occasion_key, company_id").eq("id", q.id).maybeSingle();
  check("quote persists occasion_key (stable, not occasions.id)", qrow?.occasion_key === expectedKey && qrow?.company_id === A);

  console.log("\n=== org_id standardization ===");
  // org_id renamed -> _deprecated_org_id; company_id is the live tenant column.
  const { error: oldColErr } = await admin.from("quotes").select("org_id").limit(1);
  check("quotes.org_id no longer exists (renamed to _deprecated_org_id)", !!oldColErr, oldColErr?.message?.slice(0, 60) ?? "still present");
  const { error: depColOk } = await admin.from("quotes").select("_deprecated_org_id").limit(1);
  check("_deprecated_org_id exists (reversible)", !depColOk);

  // teardown
  await admin.from("occasion_gift_state").delete().eq("company_id", A);
  await admin.from("quotes").delete().eq("company_id", A);
  await admin.from("employees").delete().eq("company_id", A);
  await admin.from("companies").delete().eq("id", A);
  const resid = (await admin.from("companies").select("id", { count: "exact", head: true }).ilike("name", "t7a\\_%")).count ?? 0;
  check(`residue t7a_ companies = 0 (got ${resid})`, resid === 0);
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
