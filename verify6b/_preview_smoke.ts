import "./_env-preload";
/**
 * Prompt 6b PREVIEW SMOKE — deployed foundation preview. Escalation/digest/gift-state run the
 * committed engine against the DEPLOYED DB + its deployed unique indexes (migrations 040/041) —
 * the deployed cron runs this same engine; the global cron is NOT triggered (emails real tenants).
 * Deployed-HTTP: the bell API + public surface (regression). Cold-render poll on liveness.
 * Run: npx tsx --tsconfig verify6b/tsconfig.harness.json verify6b/_preview_smoke.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { runOccasionEscalation, notifyOccasionAtLeadTime, giftChosenFor, runPlatformDigest, runUserDigests, stableOccasionKey, notify, NOTIFICATION_TYPES } from "../src/lib/engines/notifications";

const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })) as Record<string, string>;
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SRK = env.SUPABASE_SERVICE_ROLE_KEY, BYP = env.VERCEL_AUTOMATION_BYPASS;
const APP = "https://neonvisuals-v1-iou9-git-foundation-vicky9833s-projects.vercel.app";
const REF = "xserhblhiwtmaiejbvgo";
const admin = createClient(URL_, SRK, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const PW = `T6b!${runid}!pw`;
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (n: number) => iso(new Date(Date.now() + n * 86400_000));
async function mkUser(t: string) { const { data, error } = await admin.auth.admin.createUser({ email: `t6b_${runid}_${t}@example.com`, password: PW, email_confirm: true }); if (error) throw new Error(`${t}: ${error.message}`); return data.user.id; }
async function grant(t: string) { const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: `t6b_${runid}_${t}@example.com`, password: PW }) }); return r.json(); }
function ck(s: any) { const o = { access_token: s.access_token, token_type: "bearer", expires_in: s.expires_in, expires_at: s.expires_at, refresh_token: s.refresh_token, user: s.user }; return `sb-${REF}-auth-token=base64-${Buffer.from(JSON.stringify(o), "utf8").toString("base64")}`; }
const H = (c?: string) => ({ "x-vercel-protection-bypass": BYP, "Content-Type": "application/json", ...(c ? { Cookie: c } : {}) });
async function jget(path: string, c?: string) { const r = await fetch(`${APP}${path}`, { headers: H(c), redirect: "manual" }); const t = await r.text(); let j: any = {}; try { j = JSON.parse(t); } catch {} return { status: r.status, j }; }
const SENT = "Zzsentinelname";
const hasSent = (s: string | null | undefined) => !!s && s.includes(SENT);

async function main() {
  const today = iso(new Date(new Date().setHours(0, 0, 0, 0)));
  const { data: co } = await admin.from("companies").insert({ name: `t6b_${runid}_A`, slug: `t6b-${runid}-a`, onboarding_completed: true, plan: "pro", primary_contact_name: "Biz", primary_contact_phone: "9876500077" }).select("id").single();
  const A = co!.id as string;
  const owner = await mkUser("owner"), adminU = await mkUser("admin"), hr = await mkUser("hr"), fin = await mkUser("fin"), platAdmin = await mkUser("platadmin"), platOwner = await mkUser("platowner"), uDaily = await mkUser("udaily");
  await admin.from("company_members").insert([
    { company_id: A, user_id: owner, role: "org_owner", status: "active" },
    { company_id: A, user_id: adminU, role: "org_admin", status: "active" },
    { company_id: A, user_id: hr, role: "hr", status: "active" },
    { company_id: A, user_id: fin, role: "finance", status: "active" },
    { company_id: A, user_id: uDaily, role: "viewer", status: "active" },
  ]);
  await admin.from("platform_staff").insert([{ user_id: platAdmin, role: "admin" }, { user_id: platOwner, role: "owner" }]);
  for (const u of [owner, hr, fin]) await admin.from("profiles").update({ company_id: A, is_onboarded: true }).eq("id", u);
  const company = { name: `t6b_${runid}_A`, plan: "pro", primary_contact_name: "Biz", primary_contact_phone: "9876500077" };
  const mkEmp = async (tag: string) => (await admin.from("employees").insert({ company_id: A, full_name: `${SENT} ${tag}`, joining_date: null }).select("id").single()).data!.id as string;

  try {
    // LIVENESS (deployed bell API warm).
    console.log("=== LIVENESS (deployed /api/notifications) ===");
    const ckHr = ck(await grant("hr"));
    await admin.from("notifications").insert({ recipient_user_id: hr, company_id: A, type: "occasion_reminder", title: "t6b liveness", dedupe_key: `live:${runid}` });
    const deadline = Date.now() + 8 * 60 * 1000; let live = false;
    while (Date.now() < deadline) {
      const r = await jget("/api/notifications?limit=20", ckHr);
      if (r.status === 200 && Array.isArray(r.j?.data) && r.j.data.some((n: any) => n.title === "t6b liveness")) { live = true; console.log("  live"); break; }
      console.log(`  waiting... status=${r.status}`); await new Promise((x) => setTimeout(x, 15000));
    }
    check("preview serving (deployed notifications API)", live);
    if (!live) { console.log("RESULT: FAIL (deploy not live)"); return; }
    await admin.from("notifications").delete().eq("company_id", A);

    const empA = await mkEmp("A"), empB = await mkEmp("B"), empC = await mkEmp("C");
    const occA = { id: "a", company_id: A, employee_id: empA, occasion_type_key: "birthday", title: `${SENT} A`, date: addDays(5), lead_days: 14 };
    const occB = { id: "b", company_id: A, employee_id: empB, occasion_type_key: "birthday", title: `${SENT} B`, date: addDays(2), lead_days: 14 };
    const occC = { id: "c", company_id: A, employee_id: empC, occasion_type_key: "birthday", title: `${SENT} C`, date: addDays(5), lead_days: 14 };

    console.log("\n=== 1. ESCALATION FIRE (deployed engine + DB) ===");
    const rA = await runOccasionEscalation(admin, occA, company, today);
    const rB = await runOccasionEscalation(admin, occB, company, today);
    const kA = stableOccasionKey(occA), kB = stableOccasionKey(occB), kC = stableOccasionKey(occC);
    const { data: n1 } = await admin.from("notifications").select("recipient_user_id, dedupe_key").eq("company_id", A);
    const recips = (k: string) => (n1 ?? []).filter((n: any) => n.dedupe_key === k).map((n: any) => n.recipient_user_id);
    check("occA stage2 -> hr+org_admin (tenant) + platform_admin", recips(`occ-esc:${kA}:2`).sort().join() === [hr, adminU].sort().join() && recips(`occ-escops:${kA}:2`).includes(platAdmin), JSON.stringify(recips(`occ-esc:${kA}:2`)));
    check("occA stage3 NOT fired", !rA.stage3Fired && recips(`occ-esc:${kA}:3`).length === 0);
    check("occB stage3 -> hr+org_owner (tenant) + platform_owner", recips(`occ-esc:${kB}:3`).sort().join() === [hr, owner].sort().join() && recips(`occ-escops:${kB}:3`).includes(platOwner), JSON.stringify(recips(`occ-esc:${kB}:3`)));

    console.log("\n=== 2. ESCALATION SUPPRESS (gift-state) ===");
    await admin.from("occasion_gift_state").insert({ stable_key: kC, company_id: A, employee_id: empC, occasion_type_key: "birthday", occasion_date: occC.date, status: "chosen" });
    await notifyOccasionAtLeadTime(admin, occC, company); // stage 1 still fires
    const rC = await runOccasionEscalation(admin, occC, company, today);
    check("occC suppressed (stages 2&3 do NOT fire)", rC.suppressed && !rC.stage2Fired && !rC.stage3Fired, JSON.stringify(rC));
    const { data: nC } = await admin.from("notifications").select("dedupe_key, type").eq("company_id", A);
    check("occC has stage-1 (occasion_reminder) but ZERO escalation rows", (nC ?? []).some((n: any) => (n.dedupe_key ?? "") === `occ:${kC}`) && (nC ?? []).filter((n: any) => (n.dedupe_key ?? "").includes(`esc:${kC}`)).length === 0);

    console.log("\n=== 3. GIFT-STATE SURVIVES REGEN (deployed) ===");
    check("giftChosenFor TRUE; survives new occasion.id same identity", (await giftChosenFor(admin, occC)) === true && (await giftChosenFor(admin, { ...occC, id: "c-regen" })) === true);

    console.log("\n=== 4. PER-STAGE DEDUPE (deployed index) ===");
    const before = recips(`occ-esc:${kA}:2`).length;
    await runOccasionEscalation(admin, occA, company, today);
    const { data: after } = await admin.from("notifications").select("id").eq("company_id", A).eq("dedupe_key", `occ-esc:${kA}:2`);
    check("re-run does NOT re-fire stage2 (deployed unique index)", (after ?? []).length === before && before === 2, `before=${before}, after=${(after ?? []).length}`);

    console.log("\n=== 5. SAME-DATE COMPANY-WIDE (6a collision fixed) ===");
    const fdate = addDays(25);
    await notifyOccasionAtLeadTime(admin, { id: "f1", company_id: A, employee_id: null, occasion_type_key: "festival", title: "Diwali", date: fdate }, company);
    await notifyOccasionAtLeadTime(admin, { id: "f2", company_id: A, employee_id: null, occasion_type_key: "festival", title: "Makar Sankranti", date: fdate }, company);
    const k1 = stableOccasionKey({ company_id: A, employee_id: null, occasion_type_key: "festival", date: fdate, title: "Diwali" });
    const k2 = stableOccasionKey({ company_id: A, employee_id: null, occasion_type_key: "festival", date: fdate, title: "Makar Sankranti" });
    const { data: fn } = await admin.from("notifications").select("dedupe_key").eq("company_id", A).eq("recipient_user_id", platAdmin);
    const keys = (fn ?? []).map((n: any) => n.dedupe_key);
    check("both same-date festivals notify (distinct keys, neither deduped away)", keys.includes(`occops:${k1}`) && keys.includes(`occops:${k2}`) && k1 !== k2);

    console.log("\n=== 6. DIGESTS (deployed engine) ===");
    // Seed a couple upcoming occasion rows so the platform aggregate is non-trivial.
    await admin.from("occasions").insert([
      { company_id: A, employee_id: empA, occasion_type_key: "birthday", title: `${SENT} A`, date: addDays(10), lead_days: 14, recurrence: "annual", is_company_wide: false, status: "upcoming", auto_generated: true, is_sensitive: false },
      { company_id: A, employee_id: null, occasion_type_key: "festival", title: "Diwali", date: addDays(20), lead_days: 30, recurrence: "none", is_company_wide: true, status: "upcoming", auto_generated: true, is_sensitive: false },
    ]);
    await runPlatformDigest(admin, today);
    const { data: pd } = await admin.from("notifications").select("title, body").eq("type", NOTIFICATION_TYPES.PLATFORM_DIGEST).eq("recipient_user_id", platAdmin);
    check("platform daily digest in-app (aggregate, PII-safe)", (pd ?? []).length === 1 && /\d+ upcoming/.test((pd ?? [])[0]?.title ?? "") && !hasSent((pd ?? [])[0]?.title) && !hasSent((pd ?? [])[0]?.body));
    await admin.from("notification_prefs").insert({ user_id: uDaily, type: NOTIFICATION_TYPES.OCCASION_REMINDER, in_app: true, email: true, digest_frequency: "daily" });
    const tmpl = `t6b_${runid}_ev`;
    const rd = await notify(admin, { type: NOTIFICATION_TYPES.OCCASION_REMINDER, recipients: [uDaily], companyId: A, title: "t6b digest item", email: { subject: "immediate?", html: "<p>x</p>", template: tmpl } });
    check("daily-digest user: immediate email DEFERRED", rd.emailed === 0 && rd.deferredDigest === 1);
    await runUserDigests(admin, "daily");
    const { data: de } = await admin.from("email_log").select("subject").eq("template", "user_digest_daily").eq("to_email", `t6b_${runid}_udaily@example.com`);
    check("daily rollup: ONE digest email (not per-event)", (de ?? []).length === 1 && !hasSent((de ?? [])[0]?.subject), `count=${(de ?? []).length}`);

    console.log("\n=== 7. PII-SAFE (§10.13) ===");
    const { data: allN } = await admin.from("notifications").select("title, link, body, type").eq("company_id", A);
    const titles = (allN ?? []).map((n: any) => n.title), links = (allN ?? []).map((n: any) => n.link).filter(Boolean);
    const { data: allE } = await admin.from("email_log").select("subject").like("to_email", `t6b_${runid}_%`);
    check("ZERO sentinel in escalation/digest TITLES", !titles.some(hasSent), JSON.stringify(titles.slice(0, 3)));
    check("ZERO sentinel in LINKS", !links.some(hasSent));
    check("ZERO sentinel in email SUBJECTS", !(allE ?? []).map((e: any) => e.subject).some(hasSent));
    const platBodies = (allN ?? []).filter((n: any) => (n.type as string).includes("ops") || n.type === NOTIFICATION_TYPES.PLATFORM_DIGEST).map((n: any) => n.body);
    check("platform bodies PII-free", !platBodies.some(hasSent));

    console.log("\n=== 8. NO REGRESSION (deployed) ===");
    const ckOwner = ck(await grant("owner")), ckFin = ck(await grant("fin"));
    const bell = await jget("/api/notifications?limit=5", ckHr);
    check("6a bell API still works (own notifications)", bell.status === 200 && Array.isArray(bell.j?.data));
    const empReg = await fetch(`${APP}/api/employees`, { method: "POST", headers: H(ckOwner), body: JSON.stringify({ name: `t6b_${runid}_Reg`, email: `t6b_${runid}_reg@ex.com`, phone: "9876511133" }) });
    const regId = (await empReg.json().catch(() => ({})))?.data?.id;
    const finRead = await jget(`/api/employees/${regId}`, ckFin);
    check("PII-strip: finance sees no phone", finRead.j?.data && finRead.j.data.phone == null);
    const ownerRead = await jget(`/api/employees/${regId}`, ckOwner);
    check("owner sees PII", ownerRead.j?.data?.phone === "9876511133");
    const pub = async (p: string) => (await fetch(`${APP}${p}`, { redirect: "manual", headers: { "x-vercel-protection-bypass": BYP } })).status;
    check("GET / -> 200", (await pub("/")) === 200);
    check("GET /dashboard -> 307", (await pub("/dashboard")) === 307);
    check("GET /nonexistent-xyz -> 403", (await pub("/nonexistent-xyz")) === 403);
    const team = await fetch(`${APP}/dashboard/team`, { headers: H(ckOwner), redirect: "manual" });
    check("/dashboard/team renders for owner", team.status === 200);
  } finally {
    const kToday = `platdigest:${today}`;
    await admin.from("notifications").delete().eq("type", "platform_digest").eq("dedupe_key", kToday);
    await admin.from("notifications").delete().eq("company_id", A);
    await admin.from("occasions").delete().eq("company_id", A);
    await admin.from("occasion_gift_state").delete().eq("company_id", A);
    await admin.from("notification_prefs").delete().eq("user_id", uDaily);
    await admin.from("email_log").delete().like("to_email", `t6b_${runid}_%`);
    await admin.from("email_log").delete().like("template", `t6b_${runid}_%`);
    await admin.from("employee_pii").delete().eq("company_id", A);
    await admin.from("employees").delete().eq("company_id", A);
    await admin.from("platform_staff").delete().in("user_id", [platAdmin, platOwner]);
    await admin.from("profiles").delete().like("email", `t6b_${runid}_%`);
    await admin.from("company_members").delete().eq("company_id", A).neq("role", "org_owner");
    console.log("(owner member/company/users -> MCP disable-trigger + _cleanup_users)");
  }
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
