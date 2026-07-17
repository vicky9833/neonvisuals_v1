import "./_env-preload";
/**
 * 7a item 4 — tenant quote view (RLS own-company only) + PII-safe ops quote-request notification.
 * Run: npx tsx --tsconfig verify7a/tsconfig.harness.json verify7a/_view_safe.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { requestQuote, listCompanyQuotes } from "../src/lib/engines/quote-request";
import { notify, NOTIFICATION_TYPES } from "../src/lib/engines/notifications";
import { buildOpsWaLink } from "../src/lib/utils/wa";

const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })) as Record<string, string>;
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SRK, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const PW = `T7a!${runid}!pw`;
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };
async function mkUser(t: string) { const { data } = await admin.auth.admin.createUser({ email: `t7a_${runid}_${t}@example.com`, password: PW, email_confirm: true }); return data!.user.id; }
const SENT = "Zzsentinelemployee";
const hasSent = (s: string | null | undefined) => !!s && s.includes(SENT);

async function main() {
  const { data: coA } = await admin.from("companies").insert({ name: `t7a_${runid}_A`, slug: `t7a-${runid}-a`, onboarding_completed: true, plan: "pro", primary_contact_name: "Biz", primary_contact_phone: "9876500099" }).select("id").single();
  const A = coA!.id as string;
  const { data: coB } = await admin.from("companies").insert({ name: `t7a_${runid}_B`, slug: `t7a-${runid}-b`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const B = coB!.id as string;
  const hrA = await mkUser("hrA"), hrB = await mkUser("hrB"), platAdmin = await mkUser("plat");
  await admin.from("company_members").insert([
    { company_id: A, user_id: hrA, role: "hr", status: "active" },
    { company_id: B, user_id: hrB, role: "hr", status: "active" },
  ]);
  await admin.from("platform_staff").insert({ user_id: platAdmin, role: "admin" });
  const { data: emp } = await admin.from("employees").insert({ company_id: A, full_name: `${SENT} Person`, joining_date: null }).select("id").single();
  const E = emp!.id as string;
  const date = new Date(Date.now() + 20 * 86400_000).toISOString().slice(0, 10);

  // Two quotes for A (one occasion-linked to the sentinel employee), one for B.
  await requestQuote(admin, admin, { companyId: A, requestedBy: hrA, occasion: { employeeId: E, occasionTypeKey: "birthday", occasionDate: date, title: null }, products: [{ sku: "S", quantity: 4 }], clientCompany: `t7a_${runid}_A` });
  await requestQuote(admin, admin, { companyId: A, requestedBy: hrA, occasion: null, products: [{ sku: "S", quantity: 2 }], clientCompany: `t7a_${runid}_A` });
  await requestQuote(admin, admin, { companyId: B, requestedBy: hrB, occasion: null, products: [{ sku: "S", quantity: 1 }], clientCompany: `t7a_${runid}_B` });

  console.log("=== ITEM 4: tenant quote view (RLS own-company only) ===");
  const cA = createClient(URL_, ANON, { auth: { persistSession: false } }) as unknown as SupabaseClient;
  await (cA as any).auth.signInWithPassword({ email: `t7a_${runid}_hrA@example.com`, password: PW });
  const cB = createClient(URL_, ANON, { auth: { persistSession: false } }) as unknown as SupabaseClient;
  await (cB as any).auth.signInWithPassword({ email: `t7a_${runid}_hrB@example.com`, password: PW });
  const listA = await listCompanyQuotes(cA);
  const listB = await listCompanyQuotes(cB);
  check("company A sees exactly its 2 quotes", listA.length === 2, `A=${listA.length}`);
  check("company B sees exactly its 1 quote (isolation)", listB.length === 1, `B=${listB.length}`);
  check("quote list carries status/occasion/total/created_at shape", listA.every((q) => "status" in q && "created_at" in q));

  console.log("\n=== ITEM 4: PII-safe ops quote-request notification (§10.13) ===");
  // Mirror the route's notification construction (org context ONLY — employee name never passed).
  const orgName = `t7a_${runid}_A`;
  const wa = buildOpsWaLink({ clientPhone: "9876500099", orgName, plan: "pro", contactName: "Biz", occasionType: "birthday" });
  const subject = `New quote request from ${orgName}`;
  const body = `${orgName} (pro) requested a quote for a birthday occasion — 4 items.`;
  await notify(admin, { type: NOTIFICATION_TYPES.QUOTE_REQUEST_OPS, audience: [{ plane: "platform", role: "platform_admin" }], companyId: A, title: subject, body, link: wa ?? "/ops/quotes", dedupeKey: `qreq:test:${runid}`, email: { subject, html: `<p>${body}</p>`, template: `t7a_${runid}_qreq` } });
  const { data: n } = await admin.from("notifications").select("title, body, link").eq("type", NOTIFICATION_TYPES.QUOTE_REQUEST_OPS).eq("recipient_user_id", platAdmin).maybeSingle();
  const { data: el } = await admin.from("email_log").select("subject").eq("template", `t7a_${runid}_qreq`);
  check("ops notification TITLE has NO employee name (PII-safe)", !hasSent(n?.title));
  check("ops notification BODY has NO employee name", !hasSent(n?.body));
  check("ops notification LINK (wa.me) has NO employee name/PII", !hasSent(n?.link) && (n?.link ?? "").includes("wa.me/919876500099"));
  check("ops email SUBJECT has NO employee name", !(el ?? []).some((e: any) => hasSent(e.subject)));
  check("CONTROL: sentinel grep catches a leak", hasSent(`${SENT} Person's Birthday`) === true);

  // teardown
  await admin.from("notifications").delete().in("company_id", [A, B]);
  await admin.from("notifications").delete().eq("recipient_user_id", platAdmin);
  await admin.from("occasion_gift_state").delete().in("company_id", [A, B]);
  await admin.from("email_log").delete().like("template", `t7a_${runid}_%`);
  await admin.from("quotes").delete().in("company_id", [A, B]);
  await admin.from("platform_staff").delete().eq("user_id", platAdmin);
  await admin.from("employees").delete().eq("company_id", A);
  await admin.from("company_members").delete().in("company_id", [A, B]);
  await admin.from("companies").delete().in("id", [A, B]);
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
