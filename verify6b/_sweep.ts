import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
async function main() {
  const today = iso(new Date());
  // Founder/platform rows with NULL company_id (platform_digest) won't cascade on company delete.
  await admin.from("notifications").delete().eq("type", "platform_digest").eq("dedupe_key", `platdigest:${today}`);
  const { data: cos } = await admin.from("companies").select("id").like("name", "t6b_%");
  const ids = (cos ?? []).map((c) => c.id);
  console.log("t6b_ companies:", ids.length);
  if (ids.length) {
    await admin.from("notifications").delete().in("company_id", ids);
    await admin.from("occasion_gift_state").delete().in("company_id", ids);
    await admin.from("occasions").delete().in("company_id", ids);
    await admin.from("employee_pii").delete().in("company_id", ids);
    await admin.from("employees").delete().in("company_id", ids);
    await admin.from("company_members").delete().in("company_id", ids).neq("role", "org_owner");
  }
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 300 });
  const t6b = (users?.users ?? []).filter((u) => u.email?.startsWith("t6b_")).map((u) => u.id);
  if (t6b.length) {
    await admin.from("notification_prefs").delete().in("user_id", t6b);
    await admin.from("platform_staff").delete().in("user_id", t6b);
    await admin.from("notifications").delete().in("recipient_user_id", t6b);
  }
  await admin.from("email_log").delete().like("template", "t6b_%");
  await admin.from("email_log").delete().like("to_email", "t6b_%");
  const remOwners = ids.length ? (await admin.from("company_members").select("id", { count: "exact", head: true }).in("company_id", ids)).count ?? 0 : 0;
  console.log("remaining org_owner members on t6b_ companies (need MCP):", remOwners, "| t6b users:", t6b.length);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
