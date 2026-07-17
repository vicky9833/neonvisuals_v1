import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
async function main() {
  const { data: cos } = await admin.from("companies").select("id").like("name", "t6a_%");
  const ids = (cos ?? []).map((c) => c.id);
  console.log("t6a_ companies:", ids.length);
  if (ids.length) {
    await admin.from("notifications").delete().in("company_id", ids); // incl. any real-staff occasion_ops rows tied to a t6a company
    await admin.from("employee_pii").delete().in("company_id", ids);
    await admin.from("employees").delete().in("company_id", ids);
    await admin.from("company_members").delete().in("company_id", ids).neq("role", "org_owner");
    await admin.from("departments").delete().in("company_id", ids);
  }
  // t6a auth users -> their notification_prefs + platform_staff by user_id
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 300 });
  const t6aUsers = (users?.users ?? []).filter((u) => u.email?.startsWith("t6a_")).map((u) => u.id);
  if (t6aUsers.length) {
    await admin.from("notification_prefs").delete().in("user_id", t6aUsers);
    await admin.from("platform_staff").delete().in("user_id", t6aUsers);
    await admin.from("notifications").delete().in("recipient_user_id", t6aUsers);
  }
  await admin.from("email_log").delete().like("template", "t6a_%");
  const remOwners = ids.length ? (await admin.from("company_members").select("id", { count: "exact", head: true }).in("company_id", ids)).count ?? 0 : 0;
  console.log("remaining org_owner members on t6a_ companies (need MCP):", remOwners, "| t6a auth users:", t6aUsers.length);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
