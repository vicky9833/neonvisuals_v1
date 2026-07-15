/**
 * TENANCY PEN-TEST (permanent — runs in CI forever).
 *
 * Seeds two companies with separate users and asserts, against a REAL Supabase
 * instance using the request-scoped (anon + signed-in) client — NOT the
 * service-role client — that RLS actually isolates tenants and enforces the
 * employee PII split. This is the acceptance gate for migration 018.
 *
 * Requires env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY (read from .env.local if not already in process.env).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Env loading (.env.local fallback so the suite runs locally + in CI)
// ---------------------------------------------------------------------------
function loadEnvLocal(): void {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    return;
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      )
        val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* no .env.local — rely on process.env */
  }
}
loadEnvLocal();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const READY = Boolean(URL && ANON && SERVICE);

const admin: SupabaseClient = READY
  ? createClient(URL!, SERVICE!, { auth: { persistSession: false } })
  : (null as unknown as SupabaseClient);

const TAG = `t18_${Date.now()}`;
const PW = "Test-Passw0rd!";

interface Seeded {
  companyA: string;
  companyB: string;
  deptEng: string;
  deptDesign: string;
  empEngA: string; // dept "Engineering" in A (PII)
  empDesignA: string; // dept "Design" in A
  empB: string; // in B
  ownerA: User;
  ownerB: User;
  finance: User; // finance member of A
  viewer: User; // viewer member of A
  managerEng: User; // manager scoped to "Engineering" in A
  platform: User; // Neon Visuals staff
  multi: User; // viewer in BOTH A and B
}

let S: Seeded;

/** Signs a fresh anon client in as `user` (RLS-scoped to that user). */
async function asUser(email: string): Promise<SupabaseClient> {
  const c = createClient(URL!, ANON!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await c.auth.signInWithPassword({ email, password: PW });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return c;
}

async function makeUser(kind: string): Promise<User> {
  const email = `${TAG}_${kind}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PW,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser ${kind}: ${error?.message}`);
  return data.user;
}

beforeAll(async () => {
  if (!READY) return;

  S = {} as Seeded;
  S.ownerA = await makeUser("ownerA");
  S.ownerB = await makeUser("ownerB");
  S.finance = await makeUser("finance");
  S.viewer = await makeUser("viewer");
  S.managerEng = await makeUser("managerEng");
  S.platform = await makeUser("platform");
  S.multi = await makeUser("multi");

  const { data: companies, error: cErr } = await admin
    .from("companies")
    .insert([
      { name: `${TAG} Company A` },
      { name: `${TAG} Company B` },
    ])
    .select("id, name");
  if (cErr || !companies) throw new Error(`companies: ${cErr?.message}`);
  S.companyA = companies.find((c) => c.name.endsWith("Company A"))!.id;
  S.companyB = companies.find((c) => c.name.endsWith("Company B"))!.id;

  const { data: depts, error: dErr } = await admin
    .from("departments")
    .insert([
      { company_id: S.companyA, name: "Engineering" },
      { company_id: S.companyA, name: "Design" },
    ])
    .select("id, name");
  if (dErr || !depts) throw new Error(`departments: ${dErr?.message}`);
  S.deptEng = depts.find((d) => d.name === "Engineering")!.id;
  S.deptDesign = depts.find((d) => d.name === "Design")!.id;

  // Memberships.
  const { error: mErr } = await admin.from("company_members").insert([
    { company_id: S.companyA, user_id: S.ownerA.id, role: "org_owner" },
    { company_id: S.companyB, user_id: S.ownerB.id, role: "org_owner" },
    { company_id: S.companyA, user_id: S.finance.id, role: "finance" },
    { company_id: S.companyA, user_id: S.viewer.id, role: "viewer" },
    {
      company_id: S.companyA,
      user_id: S.managerEng.id,
      role: "manager",
      department_id: S.deptEng,
    },
    { company_id: S.companyA, user_id: S.multi.id, role: "viewer" },
    { company_id: S.companyB, user_id: S.multi.id, role: "viewer" },
  ]);
  if (mErr) throw new Error(`company_members: ${mErr.message}`);

  await admin
    .from("platform_staff")
    .insert({ user_id: S.platform.id, role: "ops" });

  // Employees (PII on base table).
  const { data: emps, error: eErr } = await admin
    .from("employees")
    .insert([
      {
        company_id: S.companyA,
        full_name: "Eng Person A",
        department: "Engineering",
        phone: "9990001111",
        dob_day: 12,
        dob_month: 6,
        delivery_address: "1 Eng Road",
      },
      {
        company_id: S.companyA,
        full_name: "Design Person A",
        department: "Design",
        phone: "9990002222",
        dob_day: 3,
        dob_month: 9,
        delivery_address: "2 Design Ave",
      },
      {
        company_id: S.companyB,
        full_name: "Person B",
        department: "Ops",
        phone: "9990003333",
        dob_day: 1,
        dob_month: 1,
        delivery_address: "3 B Street",
      },
    ])
    .select("id, full_name");
  if (eErr || !emps) throw new Error(`employees: ${eErr?.message}`);
  S.empEngA = emps.find((e) => e.full_name === "Eng Person A")!.id;
  S.empDesignA = emps.find((e) => e.full_name === "Design Person A")!.id;
  S.empB = emps.find((e) => e.full_name === "Person B")!.id;

  // A couple of tenant rows for cross-tenant read checks.
  await admin.from("reminders").insert([
    {
      company_id: S.companyB,
      reminder_type: "birthday",
      title: "B reminder",
      occasion_date: "2030-01-01",
      reminder_date: "2030-01-01",
    },
  ]);
  await admin.from("audit_log").insert([
    { actor_type: "system", company_id: S.companyB, action: "test.seed" },
    { actor_type: "system", company_id: S.companyA, action: "test.seed" },
  ]);
}, 120_000);

afterAll(async () => {
  if (!READY || !S) return;
  // Children first (FKs without cascade), then companies, then auth users.
  await admin.from("audit_log").delete().in("company_id", [S.companyA, S.companyB]);
  await admin.from("reminders").delete().in("company_id", [S.companyA, S.companyB]);
  await admin.from("employees").delete().in("company_id", [S.companyA, S.companyB]);
  await admin.from("company_members").delete().in("company_id", [S.companyA, S.companyB]);
  await admin.from("departments").delete().in("company_id", [S.companyA, S.companyB]);
  await admin.from("platform_staff").delete().eq("user_id", S.platform.id);
  await admin.from("companies").delete().in("id", [S.companyA, S.companyB]);
  for (const u of [
    S.ownerA, S.ownerB, S.finance, S.viewer, S.managerEng, S.platform, S.multi,
  ]) {
    await admin.auth.admin.deleteUser(u.id).catch(() => {});
  }
}, 120_000);

const d = READY ? describe : describe.skip;

d("migration 018 — tenant isolation (RLS, cookie client)", () => {
  it("A cannot SELECT B's employees/reminders/audit_log by company", async () => {
    const a = await asUser(S.ownerA.email!);
    const emp = await a.from("employees").select("id").eq("company_id", S.companyB);
    expect(emp.data ?? []).toHaveLength(0);
    const rem = await a.from("reminders").select("id").eq("company_id", S.companyB);
    expect(rem.data ?? []).toHaveLength(0);
    const aud = await a.from("audit_log").select("id").eq("company_id", S.companyB);
    expect(aud.data ?? []).toHaveLength(0);
  }, 60_000);

  it("A cannot SELECT B's employee by direct UUID (+ fuzzed UUIDs)", async () => {
    const a = await asUser(S.ownerA.email!);
    const direct = await a.from("employees").select("id").eq("id", S.empB);
    expect(direct.data ?? []).toHaveLength(0);

    await fc.assert(
      fc.asyncProperty(fc.array(fc.uuid(), { maxLength: 6 }), async (ids) => {
        const probe = [...ids, S.empB];
        const { data } = await a.from("employees").select("id").in("id", probe);
        // None of these ids belong to A → always empty.
        return (data ?? []).length === 0;
      }),
      { numRuns: 25 },
    );
  }, 60_000);

  it("A cannot UPDATE or DELETE B's rows by UUID", async () => {
    const a = await asUser(S.ownerA.email!);
    const upd = await a
      .from("employees")
      .update({ full_name: "HACKED" })
      .eq("id", S.empB)
      .select("id");
    expect(upd.data ?? []).toHaveLength(0); // 0 rows matched under RLS

    await a.from("employees").delete().eq("id", S.empB);
    const { data: still } = await admin
      .from("employees")
      .select("id, full_name")
      .eq("id", S.empB)
      .single();
    expect(still?.full_name).toBe("Person B"); // untouched
  }, 60_000);

  it("A cannot INSERT a row with company_id = B", async () => {
    const a = await asUser(S.ownerA.email!);
    const { error } = await a
      .from("employees")
      .insert({ company_id: S.companyB, full_name: "Intruder" });
    expect(error).not.toBeNull(); // RLS with_check violation
  }, 60_000);

  it("finance is DENIED employee PII (base rows) but reads employees_safe", async () => {
    const f = await asUser(S.finance.email!);
    const base = await f.from("employees").select("id, phone").eq("company_id", S.companyA);
    expect(base.data ?? []).toHaveLength(0); // base table denied for finance
    const safe = await f.from("employees_safe").select("id, full_name").eq("company_id", S.companyA);
    expect((safe.data ?? []).length).toBeGreaterThan(0); // safe view visible
    // The safe view must NOT expose the PII columns.
    const pii = await f.from("employees_safe").select("phone");
    expect(pii.error).not.toBeNull();
  }, 60_000);

  it("viewer cannot write anything", async () => {
    const v = await asUser(S.viewer.email!);
    const ins = await v
      .from("employees")
      .insert({ company_id: S.companyA, full_name: "ViewerWrote" });
    expect(ins.error).not.toBeNull();
    const upd = await v
      .from("employees")
      .update({ full_name: "x" })
      .eq("id", S.empEngA)
      .select("id");
    expect(upd.data ?? []).toHaveLength(0);
  }, 60_000);

  it("manager sees only their department's employees", async () => {
    const m = await asUser(S.managerEng.email!);
    const { data } = await m
      .from("employees")
      .select("id, department")
      .eq("company_id", S.companyA);
    const depts = new Set((data ?? []).map((r) => r.department));
    expect(depts.has("Engineering")).toBe(true);
    expect(depts.has("Design")).toBe(false);
  }, 60_000);

  it("platform staff can read across companies", async () => {
    const p = await asUser(S.platform.email!);
    const { data } = await p
      .from("employees")
      .select("id, company_id")
      .in("company_id", [S.companyA, S.companyB]);
    const cos = new Set((data ?? []).map((r) => r.company_id));
    expect(cos.has(S.companyA)).toBe(true);
    expect(cos.has(S.companyB)).toBe(true);
  }, 60_000);

  it("audit_log cannot be updated or deleted by ANYONE (incl. service role)", async () => {
    // org_owner
    const a = await asUser(S.ownerA.email!);
    const ownerUpd = await a
      .from("audit_log")
      .update({ action: "tamper" })
      .eq("company_id", S.companyA)
      .select("id");
    expect(ownerUpd.data ?? []).toHaveLength(0);
    // service role — blocked by the append-only trigger, not RLS
    const svcUpd = await admin
      .from("audit_log")
      .update({ action: "tamper" })
      .eq("company_id", S.companyA);
    expect(svcUpd.error).not.toBeNull();
    const svcDel = await admin.from("audit_log").delete().eq("company_id", S.companyA);
    expect(svcDel.error).not.toBeNull();
  }, 60_000);

  it("a user in TWO companies sees exactly those two", async () => {
    const mu = await asUser(S.multi.email!);
    const { data } = await mu.from("companies").select("id");
    const ids = new Set((data ?? []).map((r) => r.id));
    expect(ids.has(S.companyA)).toBe(true);
    expect(ids.has(S.companyB)).toBe(true);
    expect(ids.size).toBe(2);
  }, 60_000);
});
