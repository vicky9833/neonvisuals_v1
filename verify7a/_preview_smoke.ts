import "./_env-preload";
/**
 * Prompt 7a PREVIEW SMOKE — deployed foundation preview. Quote-request via the DEPLOYED tenant
 * route (POST /api/quotes/request); the gift-state write it performs is deployed code. Escalation
 * suppress/resume/persist run the committed engine against the DEPLOYED DB + indexes (the cron
 * runs the same engine; global cron NOT triggered). Cold-render poll on liveness.
 * Run: npx tsx --tsconfig verify7a/tsconfig.harness.json verify7a/_preview_smoke.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { runOccasionEscalation, giftChosenFor, clearGiftChosenForQuote, markGiftOrderedForQuote, stableOccasionKey, NOTIFICATION_TYPES } from "../src/lib/engines/notifications";
import { listCompanyQuotes } from "../src/lib/engines/quote-request";

const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })) as Record<string, string>;
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SRK = env.SUPABASE_SERVICE_ROLE_KEY, BYP = env.VERCEL_AUTOMATION_BYPASS;
const APP = "https://neonvisuals-v1-iou9-git-foundation-vicky9833s-projects.vercel.app";
const REF = "xserhblhiwtmaiejbvgo";
const admin = createClient(URL_, SRK, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const PW = `T7a!${runid}!pw`;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (n: number) => iso(new Date(Date.now() + n * 86400_000));
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };
async function mkUser(t: string) { const { data, error } = await admin.auth.admin.createUser({ email: `t7a_${runid}_${t}@example.com`, password: PW, email_confirm: true }); if (error) throw new Error(`${t}: ${error.message}`); return data.user.id; }
async function grant(t: string) { const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: `t7a_${runid}_${t}@example.com`, password: PW }) }); return r.json(); }
function ck(s: any) { const o = { access_token: s.access_token, token_type: "bearer", expires_in: s.expires_in, expires_at: s.expires_at, refresh_token: s.refresh_token, user: s.user }; return `sb-${REF}-auth-token=base64-${Buffer.from(JSON.stringify(o), "utf8").toString("base64")}`; }
const H = (c?: string) => ({ "x-vercel-protection-bypass": BYP, "Content-Type": "application/json", ...(c ? { Cookie: c } : {}) });
async function reqQuote(cookie: string, body: any) { const r = await fetch(`${APP}/api/quotes/request`, { method: "POST", headers: H(cookie), body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); return { status: r.status, j }; }
const SENT = "Zzsentinelemployee";
const hasSent = (s: string | null | undefined) => !!s && s.includes(SENT);

async function main() {
  const today = iso(new Date(new Date().setHours(0, 0, 0, 0)));
  const { data: coA } = await admin.from("companies").insert({ name: `t7a_${runid}_A`, slug: `t7a-${runid}-a`, onboarding_completed: true, plan: "pro", primary_contact_name: "Biz", primary_contact_phone: "9876500099" }).select("id").single();
  const A = coA!.id as string;
  const { data: coFree } = await admin.from("companies").insert({ name: `t7a_${runid}_Free`, slug: `t7a-${runid}-free`, onboarding_completed: true, plan: "free" }).select("id").single();
  const F = coFree!.id as string;
  const hr = await mkUser("hr"), fin = await mkUser("fin"), viewer = await mkUser("viewer"), freeHr = await mkUser("freehr"), platAdmin = await mkUser("plat");
  await admin.from("company_members").insert([
    { company_id: A, user_id: hr, role: "hr", status: "active" },
    { company_id: A, user_id: fin, role: "finance", status: "active" },
    { company_id: A, user_id: viewer, role: "viewer", status: "active" },
    { company_id: F, user_id: freeHr, role: "hr", status: "active" },
  ]);
  await admin.from("platform_staff").insert({ user_id: platAdmin, role: "admin" });
  for (const u of [hr, fin, viewer]) await admin.from("profiles").update({ company_id: A, is_onboarded: true }).eq("id", u);
  await admin.from("profiles").update({ company_id: F, is_onboarded: true }).eq("id", freeHr);
  const { data: emp } = await admin.from("employees").insert({ company_id: A, full_name: `${SENT} Person`, joining_date: null }).select("id").single();
  const E = emp!.id as string;
  const date = addDays(5);
  const occBody = { occasion: { employeeId: E, occasionTypeKey: "birthday", occasionDate: date, title: null }, products: [{ sku: "S", quantity: 4 }] };
  const occForEsc = { id: "x", company_id: A, employee_id: E, occasion_type_key: "birthday", title: "b", date, lead_days: 14 };
  const company = { name: `t7a_${runid}_A`, plan: "pro", primary_contact_name: "Biz", primary_contact_phone: "9876500099" };
  const ckHr = ck(await grant("hr")), ckFin = ck(await grant("fin")), ckViewer = ck(await grant("viewer")), ckFree = ck(await grant("freehr"));

  try {
    console.log("=== LIVENESS (deployed /api/quotes/request exists; finance -> 403 not 404) ===");
    const deadline = Date.now() + 8 * 60 * 1000; let live = false;
    while (Date.now() < deadline) {
      const r = await reqQuote(ckFin, occBody);
      if (r.status === 403) { live = true; console.log("  live: route deployed, finance denied (403)"); break; }
      console.log(`  waiting... status=${r.status}`); await new Promise((x) => setTimeout(x, 15000));
    }
    check("preview serving 7a (quote-request route deployed)", live);
    if (!live) { console.log("RESULT: FAIL (deploy not live)"); return; }

    console.log("\n=== 3. QUOTE-REQUEST AUTH (deployed) ===");
    check("finance DENIED (403)", (await reqQuote(ckFin, occBody)).status === 403);
    check("viewer DENIED (403)", (await reqQuote(ckViewer, occBody)).status === 403);
    const freeReq = await reqQuote(ckFree, { products: [{ sku: "S", quantity: 1 }] });
    check("Free company hr CAN request (gift ordering UNGATED, 201)", freeReq.status === 201, `status=${freeReq.status}`);

    console.log("\n=== 1a + 2. hr requests FOR occasion -> gift-state + stable-key match + SUPPRESS ===");
    const reqRes = await reqQuote(ckHr, occBody);
    check("hr request -> 201", reqRes.status === 201, JSON.stringify(reqRes.j).slice(0, 80));
    const quoteId = reqRes.j?.data?.id as string;
    const occKey = reqRes.j?.data?.occasion_key as string;
    const expectedKey = stableOccasionKey({ company_id: A, employee_id: E, occasion_type_key: "birthday", date });
    check("deployed quote.occasion_key == stableOccasionKey (they JOIN)", occKey === expectedKey, occKey);
    const { data: gs } = await admin.from("occasion_gift_state").select("stable_key, quote_id").eq("quote_id", quoteId).maybeSingle();
    check("occasion_gift_state written with matching key + quote_id", gs?.stable_key === expectedKey && gs?.quote_id === quoteId);
    check("giftChosenFor TRUE", (await giftChosenFor(admin, occForEsc)) === true);
    const r1 = await runOccasionEscalation(admin, occForEsc, company, today);
    check("escalation SUPPRESSED (deployed DB gift-state)", r1.suppressed && !r1.stage2Fired, JSON.stringify(r1));

    console.log("\n=== 1b. cancel (no order) -> CLEARED -> escalation RESUMES ===");
    const { cleared } = await clearGiftChosenForQuote(admin, quoteId); // = what updateQuoteStatus('cancelled') calls
    check("gift-state cleared (cleared=1)", cleared === 1);
    check("giftChosenFor FALSE", (await giftChosenFor(admin, occForEsc)) === false);
    const r2 = await runOccasionEscalation(admin, occForEsc, company, today);
    check("escalation RESUMES (stage 2 fires)", !r2.suppressed && r2.stage2Fired);
    await admin.from("notifications").delete().eq("company_id", A);

    console.log("\n=== 1c. request -> convert -> PERSISTS (order_id) ===");
    const req2 = await reqQuote(ckHr, occBody);
    const quoteId2 = req2.j?.data?.id as string;
    await markGiftOrderedForQuote(admin, quoteId2, "00000000-0000-0000-0000-0000000000ff"); // = what convertQuoteToOrder calls
    const { data: gs2 } = await admin.from("occasion_gift_state").select("status, order_id").eq("quote_id", quoteId2).maybeSingle();
    check("gift-state ordered + order_id linked", gs2?.status === "ordered" && gs2?.order_id === "00000000-0000-0000-0000-0000000000ff");
    check("cancel-reversal does NOT clear a committed gift", (await clearGiftChosenForQuote(admin, quoteId2)).cleared === 0);
    check("escalation stays SUPPRESSED", (await runOccasionEscalation(admin, occForEsc, company, today)).suppressed);

    console.log("\n=== 1d. survives regen ===");
    check("giftChosenFor TRUE with new occasion.id, same stable identity", (await giftChosenFor(admin, { ...occForEsc, id: "regen-1" })) === true);

    console.log("\n=== 4. TENANT QUOTE VIEW populates (RLS; org_id->company_id fix) ===");
    const cHr = createClient(URL_, ANON, { auth: { persistSession: false } }) as unknown as SupabaseClient;
    await (cHr as any).auth.signInWithPassword({ email: `t7a_${runid}_hr@example.com`, password: PW });
    const list = await listCompanyQuotes(cHr);
    check("hr sees own-company quotes (list populates)", list.length >= 2 && list.some((q) => q.id === quoteId2), `count=${list.length}`);
    const dashQuotes = await fetch(`${APP}/dashboard/quotes`, { headers: H(ckHr), redirect: "manual" });
    check("/dashboard/quotes renders for hr (200)", dashQuotes.status === 200, `status=${dashQuotes.status}`);

    console.log("\n=== 5. PII-SAFE ops notification (§10.13) ===");
    const { data: n } = await admin.from("notifications").select("title, body, link").eq("type", NOTIFICATION_TYPES.QUOTE_REQUEST_OPS).eq("recipient_user_id", platAdmin).limit(5);
    const { data: el } = await admin.from("email_log").select("subject").eq("template", "quote_request_ops").order("created_at", { ascending: false }).limit(5);
    check("ops notification present with org context", (n ?? []).length >= 1 && (n ?? []).some((x: any) => (x.title ?? "").includes(`t7a_${runid}_A`)));
    check("ZERO employee sentinel in title/body/link", !(n ?? []).some((x: any) => hasSent(x.title) || hasSent(x.body) || hasSent(x.link)));
    check("ZERO sentinel in ops email subjects", !(el ?? []).some((e: any) => hasSent(e.subject)));

    console.log("\n=== 6. NO REGRESSION ===");
    const pub = async (p: string) => (await fetch(`${APP}${p}`, { redirect: "manual", headers: { "x-vercel-protection-bypass": BYP } })).status;
    check("GET / -> 200", (await pub("/")) === 200);
    check("GET /dashboard -> 307", (await pub("/dashboard")) === 307);
    check("GET /nonexistent-xyz -> 403", (await pub("/nonexistent-xyz")) === 403);
    const bell = await fetch(`${APP}/api/notifications?limit=5`, { headers: H(ckHr), redirect: "manual" });
    check("6a bell API works", bell.status === 200);
    const contact = await fetch(`${APP}/api/contact`, { method: "POST", headers: { "x-vercel-protection-bypass": BYP, "Content-Type": "application/json" }, body: JSON.stringify({ name: "t7a Tester", email: "t7a@example.com", company: "t7a Co", message: "hi", source: "smoke" }) });
    check("public /api/contact accepts a lead", [200, 201].includes(contact.status));
  } finally {
    await admin.from("notifications").delete().in("company_id", [A, F]);
    await admin.from("notifications").delete().eq("recipient_user_id", platAdmin);
    await admin.from("occasion_gift_state").delete().in("company_id", [A, F]);
    await admin.from("email_log").delete().eq("template", "quote_request_ops");
    await admin.from("leads").delete().eq("contact_email", "t7a@example.com");
    await admin.from("quotes").delete().in("company_id", [A, F]);
    await admin.from("employees").delete().eq("company_id", A);
    await admin.from("platform_staff").delete().eq("user_id", platAdmin);
    await admin.from("profiles").delete().like("email", `t7a_${runid}_%`);
    await admin.from("company_members").delete().in("company_id", [A, F]);
    await admin.from("companies").delete().in("id", [A, F]);
    console.log("(t7a_ auth users -> _cleanup_users.mjs)");
  }
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
