import "./_env-preload";
/**
 * 7a item 3 (THE P6 obligation) — quote-request SUPPRESSES escalation; cancel/reject RESUMES it;
 * convert PERSISTS; survives regen. Engine-layer: requestQuote(writeGiftChosen),
 * clearGiftChosenForQuote (wired into updateQuoteStatus on cancel/reject), markGiftOrderedForQuote
 * (wired into convertQuoteToOrder), giftChosenFor + runOccasionEscalation (6b).
 * Run: npx tsx --tsconfig verify7a/tsconfig.harness.json verify7a/_gift_chosen.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { requestQuote } from "../src/lib/engines/quote-request";
import { giftChosenFor, runOccasionEscalation, clearGiftChosenForQuote, markGiftOrderedForQuote } from "../src/lib/engines/notifications";

const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })) as Record<string, string>;
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (n: number) => iso(new Date(Date.now() + n * 86400_000));
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };

async function main() {
  const today = iso(new Date(new Date().setHours(0, 0, 0, 0)));
  const { data: co } = await admin.from("companies").insert({ name: `t7a_${runid}_G`, slug: `t7a-${runid}-g`, onboarding_completed: true, plan: "pro", primary_contact_phone: "9876500088" }).select("id").single();
  const A = co!.id as string;
  const { data: emp } = await admin.from("employees").insert({ company_id: A, full_name: `t7a_${runid}_Emp`, joining_date: null }).select("id").single();
  const E = emp!.id as string;
  const date = addDays(5); // lead 14 -> stage2Date=occ-7=today-2 -> stage 2 eligible when no gift
  const occasion = { employeeId: E, occasionTypeKey: "birthday", occasionDate: date, title: null };
  const occForEsc = { id: "x", company_id: A, employee_id: E, occasion_type_key: "birthday", title: `${runid} bday`, date, lead_days: 14 };
  const company = { name: `t7a_${runid}_G`, plan: "pro", primary_contact_name: "C", primary_contact_phone: "9876500088" };

  console.log("=== 3a: quote-request -> gift-state -> escalation SUPPRESSED ===");
  const q = await requestQuote(admin, admin, { companyId: A, requestedBy: null as never, occasion, products: [{ sku: "S", quantity: 5 }], clientCompany: "co" });
  check("giftChosenFor TRUE after request", (await giftChosenFor(admin, occForEsc)) === true);
  const r1 = await runOccasionEscalation(admin, occForEsc, company, today);
  check("escalation SUPPRESSED (stages 2/3 do not fire)", r1.suppressed && !r1.stage2Fired && !r1.stage3Fired, JSON.stringify(r1));

  console.log("\n=== 3b: cancel (no order) -> gift-state CLEARED -> escalation RESUMES ===");
  const { cleared } = await clearGiftChosenForQuote(admin, q.id); // wired into updateQuoteStatus('cancelled'/'rejected')
  check("gift-state cleared on cancel (no order)", cleared === 1, `cleared=${cleared}`);
  check("giftChosenFor FALSE after cancel", (await giftChosenFor(admin, occForEsc)) === false);
  const r2 = await runOccasionEscalation(admin, occForEsc, company, today);
  check("escalation RESUMES (stage 2 fires again)", !r2.suppressed && r2.stage2Fired, JSON.stringify(r2));
  await admin.from("notifications").delete().eq("company_id", A); // clear the fired escalation rows

  console.log("\n=== 3c: convert to order -> gift-state PERSISTS (order_id linked) ===");
  const q2 = await requestQuote(admin, admin, { companyId: A, requestedBy: null as never, occasion, products: [{ sku: "S", quantity: 5 }], clientCompany: "co" });
  await markGiftOrderedForQuote(admin, q2.id, "00000000-0000-0000-0000-0000000000ff"); // wired into convertQuoteToOrder
  const { data: gs } = await admin.from("occasion_gift_state").select("status, order_id").eq("quote_id", q2.id).maybeSingle();
  check("gift-state marked ordered + order_id linked", gs?.status === "ordered" && gs?.order_id === "00000000-0000-0000-0000-0000000000ff");
  const { cleared: c2 } = await clearGiftChosenForQuote(admin, q2.id);
  check("cancel-reversal does NOT clear a committed (ordered) gift", c2 === 0);
  check("giftChosenFor STILL TRUE (gift committed)", (await giftChosenFor(admin, occForEsc)) === true);
  const r3 = await runOccasionEscalation(admin, occForEsc, company, today);
  check("escalation stays SUPPRESSED for a committed gift", r3.suppressed);

  console.log("\n=== 3d: survives occasion regeneration (stable key) ===");
  check("giftChosenFor TRUE with a NEW occasion.id, same stable identity", (await giftChosenFor(admin, { ...occForEsc, id: "regen-999" })) === true);

  // teardown
  await admin.from("notifications").delete().eq("company_id", A);
  await admin.from("occasion_gift_state").delete().eq("company_id", A);
  await admin.from("quotes").delete().eq("company_id", A);
  await admin.from("employees").delete().eq("company_id", A);
  await admin.from("companies").delete().eq("id", A);
  const resid = (await admin.from("occasion_gift_state").select("id", { count: "exact", head: true }).eq("company_id", A)).count ?? 0;
  check(`residue gift_state = 0 (got ${resid})`, resid === 0);
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
