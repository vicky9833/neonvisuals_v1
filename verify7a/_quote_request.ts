import "./_env-preload";
/**
 * 7a item 2 — tenant quote-request: matrix gate (quote.request per §6A), engine create
 * (company-scoped, occasion key, status), RLS isolation (own company only).
 * Run: npx tsx --tsconfig verify7a/tsconfig.harness.json verify7a/_quote_request.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { authorize } from "../src/lib/authz/matrix";
import { requestQuote } from "../src/lib/engines/quote-request";

const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })) as Record<string, string>;
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SRK, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const PW = `T7a!${runid}!pw`;
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };
async function mkUser(t: string) { const { data } = await admin.auth.admin.createUser({ email: `t7a_${runid}_${t}@example.com`, password: PW, email_confirm: true }); return data!.user.id; }
const tenant = (role: string) => ({ plane: "tenant" as const, role: role as never, departmentId: null, approvalLimit: null });

async function main() {
  console.log("=== ITEM 2: matrix gate quote.request (§6A) ===");
  check("hr ALLOWED quote.request", authorize(tenant("hr"), "quote.request").effect === "allow");
  check("org_owner ALLOWED", authorize(tenant("org_owner"), "quote.request").effect === "allow");
  check("org_admin ALLOWED", authorize(tenant("org_admin"), "quote.request").effect === "allow");
  check("manager ALLOWED", authorize(tenant("manager"), "quote.request").effect === "allow");
  check("finance DENIED", authorize(tenant("finance"), "quote.request").effect === "deny");
  check("viewer DENIED", authorize(tenant("viewer"), "quote.request").effect === "deny");

  console.log("\n=== engine create + RLS isolation ===");
  const { data: coA } = await admin.from("companies").insert({ name: `t7a_${runid}_A`, slug: `t7a-${runid}-a`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const A = coA!.id as string;
  const { data: coB } = await admin.from("companies").insert({ name: `t7a_${runid}_B`, slug: `t7a-${runid}-b`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const B = coB!.id as string;
  const hrA = await mkUser("hrA"), hrB = await mkUser("hrB");
  await admin.from("company_members").insert([
    { company_id: A, user_id: hrA, role: "hr", status: "active" },
    { company_id: B, user_id: hrB, role: "hr", status: "active" },
  ]);
  const q = await requestQuote(admin, admin, { companyId: A, requestedBy: hrA, occasion: null, products: [{ sku: "S", quantity: 3 }], clientCompany: `t7a_${runid}_A`, clientEmail: `t7a_${runid}_hrA@example.com` });
  check("quote created (company-scoped, requested_by, status draft)", !!q.id && q.status === "draft");
  const { data: qrow } = await admin.from("quotes").select("company_id, created_by, occasion_key").eq("id", q.id).maybeSingle();
  check("quote row: company_id=A, created_by=hrA, occasion_key null (ad-hoc)", qrow?.company_id === A && qrow?.created_by === hrA && qrow?.occasion_key === null);

  // RLS: hrA (company A) sees it; hrB (company B) does NOT.
  const cA = createClient(URL_, ANON, { auth: { persistSession: false } }) as unknown as SupabaseClient;
  await (cA as any).auth.signInWithPassword({ email: `t7a_${runid}_hrA@example.com`, password: PW });
  const cB = createClient(URL_, ANON, { auth: { persistSession: false } }) as unknown as SupabaseClient;
  await (cB as any).auth.signInWithPassword({ email: `t7a_${runid}_hrB@example.com`, password: PW });
  const seenByA = (await cA.from("quotes").select("id").eq("id", q.id)).data ?? [];
  const seenByB = (await cB.from("quotes").select("id").eq("id", q.id)).data ?? [];
  check("company A hr SEES the quote (RLS)", seenByA.length === 1);
  check("company B hr does NOT see it (RLS isolation)", seenByB.length === 0);

  // teardown
  await admin.from("quotes").delete().in("company_id", [A, B]);
  await admin.from("company_members").delete().in("company_id", [A, B]);
  await admin.from("companies").delete().in("id", [A, B]);
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
