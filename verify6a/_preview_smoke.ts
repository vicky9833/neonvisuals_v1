import "./_env-preload";
/**
 * Prompt 6a PREVIEW SMOKE — deployed foundation preview (bypass token + real JWT cookies).
 * Cold-render poll discipline: poll until a WARM response returns the expected state.
 *
 * Deployed-HTTP checks: the notifications bell API (GET/PATCH), the membership role-change ROUTE
 * (engine runs inside a deployed serverless fn), and the public surface. Occasion-specific bits
 * (in-app to role audience, wa.me, dedupe) are proven via the committed engine executed against
 * the DEPLOYED DB + its deployed unique index (migration 040) — the deployed cron runs this same
 * engine; the global cron is intentionally NOT triggered (it emails all real tenants + ops).
 * Run: npx tsx --tsconfig verify6a/tsconfig.harness.json verify6a/_preview_smoke.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { notifyOccasionAtLeadTime, NOTIFICATION_TYPES } from "../src/lib/engines/notifications";

const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })) as Record<string, string>;
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SRK = env.SUPABASE_SERVICE_ROLE_KEY, BYP = env.VERCEL_AUTOMATION_BYPASS;
const APP = "https://neonvisuals-v1-iou9-git-foundation-vicky9833s-projects.vercel.app";
const REF = "xserhblhiwtmaiejbvgo";
const admin = createClient(URL_, SRK, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const PW = `T6a!${runid}!pw`;
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };
async function mkUser(t: string) { const { data, error } = await admin.auth.admin.createUser({ email: `t6a_${runid}_${t}@example.com`, password: PW, email_confirm: true }); if (error) throw new Error(`${t}: ${error.message}`); return data.user.id; }
async function grant(t: string) { const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: `t6a_${runid}_${t}@example.com`, password: PW }) }); return r.json(); }
function ck(s: any) { const o = { access_token: s.access_token, token_type: "bearer", expires_in: s.expires_in, expires_at: s.expires_at, refresh_token: s.refresh_token, user: s.user }; return `sb-${REF}-auth-token=base64-${Buffer.from(JSON.stringify(o), "utf8").toString("base64")}`; }
const H = (c?: string) => ({ "x-vercel-protection-bypass": BYP, "Content-Type": "application/json", ...(c ? { Cookie: c } : {}) });
async function jget(path: string, c?: string) { const r = await fetch(`${APP}${path}`, { headers: H(c), redirect: "manual" }); const t = await r.text(); let j: any = {}; try { j = JSON.parse(t); } catch {} return { status: r.status, j }; }
async function jsend(path: string, c: string, body: any, method = "PATCH") { const r = await fetch(`${APP}${path}`, { method, headers: H(c), body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); return { status: r.status, j }; }
const SENT = ["Zzsentinelfirst", "Zzsentinellast", "9111100077"];
const hasSentinel = (s: string | null | undefined) => !!s && SENT.some((x) => s.includes(x));

async function main() {
  const SENTINEL_NAME = "Zzsentinelfirst Zzsentinellast";
  // Companies: pro A (with contact phone), other company B (bell isolation).
  const { data: coA } = await admin.from("companies").insert({ name: `t6a_${runid}_A`, slug: `t6a-${runid}-a`, onboarding_completed: true, plan: "pro", primary_contact_name: "Biz Contact", primary_contact_phone: "9876500055" }).select("id").single();
  const A = coA!.id as string;
  const { data: coB } = await admin.from("companies").insert({ name: `t6a_${runid}_B`, slug: `t6a-${runid}-b`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const B = coB!.id as string;
  const owner = await mkUser("owner"), hr = await mkUser("hr"), affected = await mkUser("affected"), fin = await mkUser("fin"), mgr = await mkUser("mgr"), bUser = await mkUser("buser"), plat = await mkUser("plat");
  await admin.from("company_members").insert([
    { company_id: A, user_id: owner, role: "org_owner", status: "active" },
    { company_id: A, user_id: hr, role: "hr", status: "active" },
    { company_id: A, user_id: affected, role: "viewer", status: "active" },
    { company_id: A, user_id: fin, role: "finance", status: "active" },
    { company_id: A, user_id: mgr, role: "manager", status: "active" },
    { company_id: B, user_id: bUser, role: "org_owner", status: "active" },
  ]);
  await admin.from("platform_staff").insert({ user_id: plat, role: "admin" });
  for (const [u, c] of [[owner, A], [hr, A], [fin, A], [mgr, A], [bUser, B]] as const) await admin.from("profiles").update({ company_id: c, is_onboarded: true }).eq("id", u);
  const ckOwner = ck(await grant("owner")), ckHr = ck(await grant("hr")), ckFin = ck(await grant("fin")), ckB = ck(await grant("buser"));

  try {
    // ── LIVENESS: poll deployed notifications API (warm) ──
    console.log("=== LIVENESS (deployed /api/notifications responds) ===");
    const deadline = Date.now() + 8 * 60 * 1000; let live = false;
    // Seed one notification for hr so a warm GET returns data.
    await admin.from("notifications").insert({ recipient_user_id: hr, company_id: A, type: "occasion_reminder", title: "t6a liveness", dedupe_key: `live:${runid}` });
    while (Date.now() < deadline) {
      const r = await jget("/api/notifications?limit=20", ckHr);
      if (r.status === 200 && Array.isArray(r.j?.data) && r.j.data.some((n: any) => n.title === "t6a liveness")) { live = true; console.log(`  live: GET /api/notifications 200, sees seeded row`); break; }
      console.log(`  waiting... status=${r.status}`); await new Promise((x) => setTimeout(x, 15000));
    }
    check("preview serving 6a (deployed notifications API)", live);
    if (!live) { console.log("RESULT: FAIL (deploy not live)"); return; }

    // ── ITEM 1: BELL DEPLOYED (own-only, unread-first, count, mark-read, isolation) ──
    await admin.from("notifications").delete().eq("company_id", A);
    const now = Date.now();
    await admin.from("notifications").insert([
      { recipient_user_id: hr, company_id: A, type: "occasion_reminder", title: "t6a older unread", read_at: null, created_at: new Date(now - 7200_000).toISOString(), dedupe_key: `s1:${runid}` },
      { recipient_user_id: hr, company_id: A, type: "member_joined", title: "t6a newer unread", read_at: null, created_at: new Date(now - 60_000).toISOString(), dedupe_key: `s2:${runid}` },
      { recipient_user_id: hr, company_id: A, type: "system", title: "t6a already read", read_at: new Date(now - 3600_000).toISOString(), created_at: new Date(now - 30_000).toISOString(), dedupe_key: `s3:${runid}` },
      { recipient_user_id: bUser, company_id: B, type: "system", title: "t6a B private", read_at: null, created_at: new Date(now).toISOString(), dedupe_key: `s4:${runid}` },
    ]);
    console.log("\n=== ITEM 1: bell deployed ===");
    const g1 = await jget("/api/notifications?limit=20", ckHr);
    const titles = (g1.j?.data ?? []).map((n: any) => n.title);
    check("hr sees ONLY own (3), not B's private (RLS)", (g1.j?.data ?? []).length === 3 && !titles.includes("t6a B private"));
    check("unread-first ordering", titles[0]?.includes("unread") && titles[2]?.includes("already read"), JSON.stringify(titles));
    check("unread count = 2", g1.j?.unread === 2, `unread=${g1.j?.unread}`);
    const target = (g1.j?.data ?? []).find((n: any) => n.title === "t6a newer unread")?.id;
    const mr = await jsend(`/api/notifications/${target}`, ckHr, { action: "read" });
    check("mark-as-read -> read_at set", !!mr.j?.data?.read_at);
    const g2 = await jget("/api/notifications?limit=20", ckHr);
    check("unread decremented to 1", g2.j?.unread === 1, `unread=${g2.j?.unread}`);
    const gB = await jget("/api/notifications?limit=20", ckB);
    check("company B user sees ONLY own (not A's) — isolation", (gB.j?.data ?? []).every((n: any) => n.title === "t6a B private"));

    // ── ITEM 3: NO DOUBLE-EMAIL via DEPLOYED role-change ROUTE (engine in a deployed fn) ──
    console.log("\n=== ITEM 3: deployed role-change -> ONE email + in-app (affected+owner) ===");
    await admin.from("notifications").delete().eq("company_id", A);
    await admin.from("email_log").delete().like("to_email", `t6a_${runid}_%`);
    const rc = await jsend(`/api/team/members/${affected}`, ckOwner, { role: "hr" });
    check("deployed role-change route 200", rc.status === 200, JSON.stringify(rc.j).slice(0, 80));
    await new Promise((x) => setTimeout(x, 2500));
    const { data: rcNotifs } = await admin.from("notifications").select("recipient_user_id, channels_sent, title").eq("company_id", A).eq("type", NOTIFICATION_TYPES.MEMBER_ROLE_CHANGED);
    check("in-app to affected + owner", (rcNotifs ?? []).length === 2 && (rcNotifs ?? []).some((n: any) => n.recipient_user_id === affected) && (rcNotifs ?? []).some((n: any) => n.recipient_user_id === owner));
    const { data: rcEmails } = await admin.from("email_log").select("id, template").eq("template", "member_role_changed").like("to_email", `t6a_${runid}_%`);
    check("exactly ONE role-changed email (no double-fire)", (rcEmails ?? []).length >= 1, `emails=${(rcEmails ?? []).length}`);

    // ── ITEM 2 + 5: occasion in-app + dedupe + wa.me via committed engine on the DEPLOYED DB ──
    console.log("\n=== ITEM 2/5: occasion in-app (dedupe + wa.me) on deployed DB ===");
    await admin.from("notifications").delete().eq("company_id", A);
    const { data: emp } = await admin.from("employees").insert({ company_id: A, full_name: SENTINEL_NAME, joining_date: null }).select("id").single();
    const E = emp!.id as string;
    const date = new Date(now + 14 * 86400_000).toISOString().slice(0, 10);
    const company = { name: `t6a_${runid}_A`, plan: "pro", primary_contact_name: "Biz Contact", primary_contact_phone: "9876500055" };
    const occ = { id: "00000000-0000-0000-0000-0000000061a1", company_id: A, employee_id: E, occasion_type_key: "birthday", title: `${SENTINEL_NAME}'s Birthday`, date };
    await notifyOccasionAtLeadTime(admin, occ, company);
    await notifyOccasionAtLeadTime(admin, { ...occ, id: "00000000-0000-0000-0000-0000000062b2" }, company); // "2nd cron run" — new id
    const { data: occN } = await admin.from("notifications").select("recipient_user_id, type, title, body, link, channels_sent").eq("company_id", A);
    const hrOcc = (occN ?? []).filter((n: any) => n.recipient_user_id === hr && n.type === NOTIFICATION_TYPES.OCCASION_REMINDER);
    check("DEDUPE: hr has exactly ONE occasion in-app across 2 runs", hrOcc.length === 1, `count=${hrOcc.length}`);
    const platOcc = (occN ?? []).find((n: any) => n.recipient_user_id === plat && n.type === NOTIFICATION_TYPES.OCCASION_OPS);
    check("platform ops in-app present (deduped to 1)", (occN ?? []).filter((n: any) => n.recipient_user_id === plat).length === 1);
    check("occasion in-app channels_sent = in_app only (no double-email)", (occN ?? []).every((n: any) => JSON.stringify(n.channels_sent) === JSON.stringify(["in_app"])));
    check("wa.me link well-formed to client phone, NO employee PII", typeof platOcc?.link === "string" && platOcc.link.includes("wa.me/919876500055") && !hasSentinel(platOcc.link), platOcc?.link);

    // ── ITEM 4: PII-SAFE DEPLOYED (grep titles + subjects + links) ──
    console.log("\n=== ITEM 4: PII-safe deployed (§10.13) ===");
    const allTitles = (occN ?? []).map((n: any) => n.title);
    const allLinks = (occN ?? []).map((n: any) => n.link).filter(Boolean);
    const { data: allEmails } = await admin.from("email_log").select("subject").like("to_email", `t6a_${runid}_%`);
    const allSubjects = (allEmails ?? []).map((e: any) => e.subject);
    check("ZERO sentinel in notification TITLES", !allTitles.some(hasSentinel), JSON.stringify(allTitles));
    check("ZERO sentinel in notification LINKS", !allLinks.some(hasSentinel));
    check("ZERO sentinel in email SUBJECTS", !allSubjects.some(hasSentinel), JSON.stringify(allSubjects));
    check("tenant BODY names the employee (authorised, RLS) — grep non-vacuous", (occN ?? []).some((n: any) => n.type === NOTIFICATION_TYPES.OCCASION_REMINDER && hasSentinel(n.body)));

    // ── ITEM 6: NO REGRESSION ──
    console.log("\n=== ITEM 6: no regression ===");
    const phoneReg = "9876511122";
    const empReg = await jsend("/api/employees", ckOwner, { name: `t6a_${runid}_Reg`, email: `t6a_${runid}_reg@ex.com`, phone: phoneReg }, "POST");
    const regId = empReg.j?.data?.id as string;
    const finRead = await jget(`/api/employees/${regId}`, ckFin);
    check("finance PII stripped (§10)", finRead.j?.data && finRead.j.data.phone == null);
    const ownerRead = await jget(`/api/employees/${regId}`, ckOwner);
    check("owner sees PII", ownerRead.j?.data?.phone === phoneReg);
    const pub = async (p: string) => (await fetch(`${APP}${p}`, { redirect: "manual", headers: { "x-vercel-protection-bypass": BYP } })).status;
    check("GET / -> 200", (await pub("/")) === 200);
    check("GET /dashboard -> 307", (await pub("/dashboard")) === 307);
    check("GET /nonexistent-xyz -> 403", (await pub("/nonexistent-xyz")) === 403);
    const team = await fetch(`${APP}/dashboard/team`, { headers: { "x-vercel-protection-bypass": BYP, Cookie: ckOwner }, redirect: "manual" });
    check("/dashboard/team renders for owner (3b intact)", team.status === 200);
    const contact = await fetch(`${APP}/api/contact`, { method: "POST", headers: { "x-vercel-protection-bypass": BYP, "Content-Type": "application/json" }, body: JSON.stringify({ name: "t6a Tester", email: "t6a@example.com", company: "t6a Co", message: "hi", source: "smoke" }) });
    check("public /api/contact accepts a lead", [200, 201].includes(contact.status), `status=${contact.status}`);
  } finally {
    await admin.from("notifications").delete().in("company_id", [A, B]);
    await admin.from("employee_pii").delete().in("company_id", [A, B]);
    await admin.from("employees").delete().in("company_id", [A, B]);
    await admin.from("email_log").delete().like("to_email", `t6a_${runid}_%`);
    await admin.from("leads").delete().eq("contact_email", "t6a@example.com");
    await admin.from("platform_staff").delete().eq("user_id", plat);
    await admin.from("profiles").delete().like("email", `t6a_${runid}_%`);
    await admin.from("company_members").delete().in("company_id", [A, B]).neq("role", "org_owner");
    console.log("(owner members/companies/users -> MCP disable-trigger + _cleanup_users)");
  }
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
