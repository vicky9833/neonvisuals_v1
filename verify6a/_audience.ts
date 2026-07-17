import "./_env-preload";
/**
 * 6a item 1 — role-audience resolution + tenant isolation.
 * Run: npx tsx --tsconfig verify6a/tsconfig.harness.json verify6a/_audience.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolveAudienceSpec } from "../src/lib/engines/notifications";

const env = Object.fromEntries(readFileSync("c:/neonvisuals_v1/.env.local", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })) as Record<string, string>;
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
let pass = true;
const check = (l: string, c: boolean, extra = "") => { if (!c) pass = false; console.log(`  ${c ? "PASS" : "FAIL"}  ${l}${extra ? "  " + extra : ""}`); };
async function mkUser(tag: string) { const { data, error } = await admin.auth.admin.createUser({ email: `t6a_${runid}_${tag}@example.com`, password: `T6a!${runid}!pw`, email_confirm: true }); if (error) throw new Error(`${tag}: ${error.message}`); return data.user.id; }
const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

async function main() {
  const { data: coA } = await admin.from("companies").insert({ name: `t6a_${runid}_A`, slug: `t6a-${runid}-a`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const A = coA!.id as string;
  const { data: coB } = await admin.from("companies").insert({ name: `t6a_${runid}_B`, slug: `t6a-${runid}-b`, onboarding_completed: true, plan: "pro" }).select("id").single();
  const B = coB!.id as string;
  const owner = await mkUser("owner"), adminU = await mkUser("admin"), hr = await mkUser("hr"), mgr = await mkUser("mgr"), viewer = await mkUser("viewer");
  const bHr = await mkUser("bhr");
  const platU = await mkUser("plat"); // platform admin

  // Dept D in A with manager mgr.
  const { data: dept } = await admin.from("departments").insert({ company_id: A, name: `t6a_${runid}_Eng`, manager_id: mgr }).select("id").single();
  const D = dept!.id as string;

  await admin.from("company_members").insert([
    { company_id: A, user_id: owner, role: "org_owner", status: "active" },
    { company_id: A, user_id: adminU, role: "org_admin", status: "active" },
    { company_id: A, user_id: hr, role: "hr", status: "active" },
    { company_id: A, user_id: mgr, role: "manager", department_id: D, status: "active" },
    { company_id: A, user_id: viewer, role: "viewer", status: "active" },
    { company_id: B, user_id: bHr, role: "hr", status: "active" },
  ]);
  await admin.from("platform_staff").insert({ user_id: platU, role: "admin" });

  console.log("=== ITEM 1: role-audience resolution ===");
  const r = (spec: Parameters<typeof resolveAudienceSpec>[1], ctx = {}) => resolveAudienceSpec(admin, spec, { companyId: A, ...ctx });
  check("tenant hr -> {hr}", sameSet(await r({ plane: "tenant", role: "hr" }), [hr]));
  check("tenant org_admin -> {admin}", sameSet(await r({ plane: "tenant", role: "org_admin" }), [adminU]));
  check("tenant org_owner -> {owner}", sameSet(await r({ plane: "tenant", role: "org_owner" }), [owner]));
  check("tenant dept_manager(D) -> {mgr} only", sameSet(await r({ plane: "tenant", role: "dept_manager" }, { departmentId: D }), [mgr]));
  const platAdmins = await resolveAudienceSpec(admin, { plane: "platform", role: "platform_admin" }, {});
  check("platform_admin includes our t6a_ platform user", platAdmins.includes(platU));
  check("platform_admin does NOT include any tenant user", !platAdmins.some((u) => [owner, adminU, hr, mgr, viewer, bHr].includes(u)));

  console.log("\n=== tenant isolation ===");
  const hrA = await r({ plane: "tenant", role: "hr" });
  check("company A hr audience excludes company B's hr (no cross-company)", !hrA.includes(bHr) && hrA.includes(hr));
  const hrB = await resolveAudienceSpec(admin, { plane: "tenant", role: "hr" }, { companyId: B });
  check("company B hr -> {bHr} only", sameSet(hrB, [bHr]));
  check("dept_manager with no departmentId -> empty (no leak)", (await r({ plane: "tenant", role: "dept_manager" })).length === 0);

  // teardown (leaves org_owner member + companies for MCP sweep; platform_staff deletable)
  await admin.from("platform_staff").delete().eq("user_id", platU);
  await admin.from("company_members").delete().in("company_id", [A, B]).neq("role", "org_owner");
  await admin.from("departments").delete().in("company_id", [A, B]);
  console.log(`\nRESULT: ${pass ? "PASS" : "FAIL"}`);
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
