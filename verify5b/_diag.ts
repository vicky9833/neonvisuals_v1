/**
 * Diagnostic: (1) clean up failed-smoke residue incl. GLOBAL platform_blackout_dates,
 * (2) run generateOccasions under a real OWNER-JWT client (owner RLS context) against the
 * shared DB to isolate "deploy not live" from a real owner-context write failure.
 * Run: npx tsx --tsconfig verify5b/tsconfig.harness.json verify5b/_diag.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { generateOccasions } from "../src/lib/engines/occasion-generator";

const env = Object.fromEntries(
  readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
) as Record<string, string>;
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SRK, { auth: { persistSession: false, autoRefreshToken: false } });
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const PW = `T5b!${runid}!pw`;

async function main() {
  // ---- (1) CLEANUP failed-smoke residue ----
  console.log("=== CLEANUP failed-smoke residue ===");
  await admin.from("platform_blackout_dates").delete().like("note", "t5b_%");
  const platResid = (await admin.from("platform_blackout_dates").select("id", { count: "exact", head: true }).like("note", "t5b_%")).count ?? 0;
  console.log("  platform_blackout_dates t5b_ remaining:", platResid);
  const { data: cos } = await admin.from("companies").select("id, name").like("name", "t5b_%");
  const ids = (cos ?? []).map((c) => c.id as string);
  console.log("  t5b_ companies found:", ids.length);
  if (ids.length) {
    await admin.from("reminders").delete().in("company_id", ids);
    await admin.from("occasions").delete().in("company_id", ids);
    await admin.from("company_festivals").delete().in("company_id", ids);
    await admin.from("employee_pii").delete().in("company_id", ids);
    await admin.from("employees").delete().in("company_id", ids);
    await admin.from("departments").delete().in("company_id", ids);
    await admin.from("company_members").delete().in("company_id", ids).neq("role", "org_owner");
    for (const id of ids) await admin.from("companies").update({ blackout_dates: [] }).eq("id", id);
    // email_log t5b_ contacts
    await admin.from("email_log").delete().like("to_email", "t5b_%");
  }
  console.log("  (org_owner members + auth users need MCP disable-trigger step)");

  // ---- (2) OWNER-RLS generateOccasions test ----
  console.log("\n=== OWNER-RLS generateOccasions (isolates deploy-live from RLS/logic) ===");
  const email = `t5b_${runid}_diagowner@example.com`;
  const { data: u, error: ue } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true });
  if (ue) throw new Error(ue.message);
  const ownerId = u.user.id;
  const { data: co } = await admin.from("companies").insert({ name: `t5b_${runid}_diag`, slug: `t5b-${runid}-diag`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const A = co!.id as string;
  await admin.from("company_members").insert({ company_id: A, user_id: ownerId, role: "org_owner", status: "active" });
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const add = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };
  const { data: e } = await admin.from("employees").insert([
    { company_id: A, full_name: `t5b_${runid}_DiagEmp`, joining_date: add(-3650) },
  ]).select("id");
  await admin.from("employee_pii").insert({ employee_id: e![0].id, company_id: A, phone_enc: "enc", dob_day: 15, dob_month: 6 });

  // Build an OWNER-JWT client (RLS context == deployed dashboard).
  const ownerClient = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
  const { error: se } = await (ownerClient as any).auth.signInWithPassword({ email, password: PW });
  if (se) throw new Error("signin: " + se.message);

  let genErr: string | null = null; let result: any = null;
  try { result = await generateOccasions(A, ownerClient); }
  catch (err) { genErr = err instanceof Error ? err.message : String(err); }
  console.log("  generateOccasions(ownerClient) ->", genErr ? `THREW: ${genErr}` : JSON.stringify(result));
  const { count: occCount } = await admin.from("occasions").select("id", { count: "exact", head: true }).eq("company_id", A).eq("auto_generated", true);
  console.log("  occasions written (admin count):", occCount ?? 0);
  console.log(genErr || (occCount ?? 0) === 0
    ? "  >>> OWNER-CONTEXT WRITE FAILED — real bug (deployed dashboard cannot generate)."
    : "  >>> OWNER-CONTEXT WRITE OK — engine fine under RLS; smoke failure = deploy not live yet.");

  // cleanup diag data (owner member left for MCP)
  await admin.from("occasions").delete().eq("company_id", A);
  await admin.from("employee_pii").delete().eq("company_id", A);
  await admin.from("employees").delete().eq("company_id", A);
  console.log("\n(diag owner member + all t5b_ owner members/users -> MCP step next)");
}
main().catch((err) => { console.error("FATAL", err); process.exit(1); });
