/**
 * Sweep all t5b_ data rows (everything deletable without the last-owner trigger). org_owner
 * members + auth users are handled by the MCP disable-trigger step + _cleanup_users after.
 * Run: npx tsx verify5b/_sweep.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
async function main() {
  await admin.from("platform_blackout_dates").delete().like("note", "t5b_%");
  const { data: cos } = await admin.from("companies").select("id").like("name", "t5b_%");
  const ids = (cos ?? []).map((c) => c.id as string);
  console.log("t5b_ companies:", ids.length);
  if (ids.length) {
    await admin.from("reminders").delete().in("company_id", ids);
    await admin.from("occasions").delete().in("company_id", ids);
    await admin.from("company_festivals").delete().in("company_id", ids);
    await admin.from("employee_pii").delete().in("company_id", ids);
    await admin.from("employees").delete().in("company_id", ids);
    await admin.from("departments").delete().in("company_id", ids);
    await admin.from("company_members").delete().in("company_id", ids).neq("role", "org_owner");
  }
  await admin.from("email_log").delete().like("to_email", "t5b_%");
  await admin.from("profiles").delete().like("email", "t5b_%");
  const remainingOwners = (await admin.from("company_members").select("company_id", { count: "exact", head: true }).in("company_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])).count ?? 0;
  console.log("remaining org_owner members on t5b_ companies (need MCP):", remainingOwners);
  console.log("platform_blackout t5b_ remaining:", (await admin.from("platform_blackout_dates").select("id", { count: "exact", head: true }).like("note", "t5b_%")).count ?? 0);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
