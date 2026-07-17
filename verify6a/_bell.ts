import "./_env-preload";
/**
 * 6a item 3 — the bell reads the user's OWN notifications (RLS), unread-first,
 * unread count correct, mark-as-read sets read_at + decrements. Tested via a real
 * user JWT running the EXACT queries the /api/notifications routes issue.
 * Run: npx tsx --tsconfig verify6a/tsconfig.harness.json verify6a/_bell.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })) as Record<string, string>;
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SRK, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const PW = `T6a!${runid}!pw`;
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };
async function mkUser(tag: string) { const { data } = await admin.auth.admin.createUser({ email: `t6a_${runid}_${tag}@example.com`, password: PW, email_confirm: true }); return data!.user.id; }
async function jwt(tag: string) { const c = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient; await (c as any).auth.signInWithPassword({ email: `t6a_${runid}_${tag}@example.com`, password: PW }); return c; }

async function main() {
  const { data: co } = await admin.from("companies").insert({ name: `t6a_${runid}_bell`, slug: `t6a-${runid}-bell`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const A = co!.id as string;
  const u1 = await mkUser("u1"), u2 = await mkUser("u2");
  // 3 notifications for u1 (2 unread, 1 already read); 1 for u2 (isolation).
  const past = new Date(Date.now() - 3600_000).toISOString();
  const now = Date.now();
  const { error: insErr } = await admin.from("notifications").insert([
    { recipient_user_id: u1, company_id: A, type: "occasion_reminder", title: "t6a u1 older unread", read_at: null, created_at: new Date(now - 7200_000).toISOString() },
    { recipient_user_id: u1, company_id: A, type: "member_joined", title: "t6a u1 newer unread", read_at: null, created_at: new Date(now - 60_000).toISOString() },
    { recipient_user_id: u1, company_id: A, type: "system", title: "t6a u1 already read", read_at: past, created_at: new Date(now - 30_000).toISOString() },
    { recipient_user_id: u2, company_id: A, type: "system", title: "t6a u2 private", read_at: null, created_at: new Date(now).toISOString() },
  ]);
  if (insErr) console.log("  [debug] insert error:", insErr.message);
  const { count: adminCount } = await admin.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_user_id", u1);
  console.log("  [debug] admin sees u1 rows:", adminCount);

  const c1 = await jwt("u1");
  const { data: whoami } = await (c1 as any).auth.getUser();
  console.log("  [debug] c1 uid:", whoami?.user?.id, "== u1?", whoami?.user?.id === u1);
  // Exact GET query: unread-first (read_at nulls first), newest first.
  const { data: list } = await c1.from("notifications").select("id, title, read_at, recipient_user_id").order("read_at", { ascending: true, nullsFirst: true }).order("created_at", { ascending: false });
  console.log("=== ITEM 3: bell (own-only, unread-first, count, mark-read) ===");
  check("u1 sees ONLY own rows (RLS) — 3, not u2's", (list ?? []).length === 3 && (list ?? []).every((n: any) => n.recipient_user_id === u1));
  const titles = (list ?? []).map((n: any) => n.title);
  check("unread ordered before read (unread-first)", titles[0]?.includes("unread") && titles[1]?.includes("unread") && titles[2]?.includes("already read"), JSON.stringify(titles));
  const { count: unread0 } = await c1.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  check("unread count = 2", unread0 === 2, `unread=${unread0}`);

  // mark newest unread read.
  const target = (list ?? []).find((n: any) => n.title.includes("newer unread"))!.id;
  const { data: upd } = await c1.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", target).select("id, read_at").maybeSingle();
  check("mark-as-read sets read_at", !!(upd as any)?.read_at);
  const { count: unread1 } = await c1.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  check("unread count decremented to 1", unread1 === 1, `unread=${unread1}`);

  // u2 cannot mark u1's row (RLS) — update matches 0 rows.
  const c2 = await jwt("u2");
  const { data: hack } = await c2.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", target).select("id");
  check("u2 CANNOT modify u1's notification (RLS)", (hack ?? []).length === 0);

  await admin.from("notifications").delete().eq("company_id", A);
  await admin.from("company_members").delete().eq("company_id", A);
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
