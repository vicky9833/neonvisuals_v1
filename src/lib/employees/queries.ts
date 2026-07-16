import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  encryptPIINullable,
  decryptPIINullable,
} from "@/lib/services/pii-crypto";
import type { Employee, EmployeeFormData } from "@/types/employee";

/**
 * Company-scoped employee data access (Prompt 4a PII split).
 *
 * The employee row is now TWO tables:
 *   - `employees`     — identity/work columns (readable by any company member).
 *   - `employee_pii`  — phone/delivery_address (app-encrypted AES-256-GCM
 *                        envelopes), city/pincode/dob/notes (plaintext), behind
 *                        §6A RLS (owner/admin/hr + manager-own-dept + platform).
 *
 * Reads use the request-scoped (cookie) client so RLS enforces §6A: a principal
 * who cannot see a PII row simply gets `pii = null` and the PII fields resolve
 * to null. phone/delivery_address are DECRYPTED here (server-only).
 *
 * NOTE (Prompt 4a scope): `department` is now an FK (`department_id`). Resolving
 * a free-text department NAME on write is deferred to the departments CRUD
 * (Prompt 5); create/import do not persist department until then. Reads expose
 * the department name via the `departments` FK embed.
 */

const DEPT_EMBED = "department:departments(name)";
const IDENTITY_COLS = `id, company_id, name:full_name, email, employee_code, designation, department_id, ${DEPT_EMBED}, joining_date, manager_name, manager_email, tshirt_size, dietary_preference, hobbies, interests, is_active, avatar_url, created_at, updated_at, created_by`;
const PII_EMBED =
  "pii:employee_pii(phone_enc, delivery_address_enc, city, pincode, dob_day, dob_month, notes, consent_status)";

const clean = (v: string | undefined | null): string | null =>
  v === undefined || v === null ? null : v.trim() === "" ? null : v.trim();

interface DeptRel {
  name: string | null;
}
interface PiiRel {
  phone_enc: string | null;
  delivery_address_enc: string | null;
  city: string | null;
  pincode: string | null;
  dob_day: number | null;
  dob_month: number | null;
  notes: string | null;
  consent_status: string | null;
}
interface EmployeeRow {
  id: string;
  company_id: string;
  name: string;
  email: string;
  employee_code: string | null;
  designation: string | null;
  department_id: string | null;
  department: DeptRel | null;
  joining_date: string | null;
  manager_name: string | null;
  manager_email: string | null;
  tshirt_size: string | null;
  dietary_preference: string | null;
  hobbies: string | null;
  interests: string | null;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  pii?: PiiRel | null;
}

/** Maps a joined row (+ optional PII embed) to the app `Employee`, decrypting PII. */
async function mapRow(row: EmployeeRow): Promise<Employee> {
  const pii = row.pii ?? null;
  return {
    id: row.id,
    company_id: row.company_id,
    name: row.name,
    email: row.email,
    employee_code: row.employee_code,
    designation: row.designation,
    department_id: row.department_id,
    department: row.department?.name ?? null,
    joining_date: row.joining_date,
    manager_name: row.manager_name,
    manager_email: row.manager_email,
    tshirt_size: (row.tshirt_size as Employee["tshirt_size"]) ?? null,
    dietary_preference:
      (row.dietary_preference as Employee["dietary_preference"]) ?? null,
    hobbies: row.hobbies,
    interests: row.interests,
    is_active: row.is_active,
    avatar_url: row.avatar_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
    // PII (null when the caller is not permitted to read the employee_pii row).
    phone: pii ? await decryptPIINullable(pii.phone_enc) : null,
    delivery_address: pii ? await decryptPIINullable(pii.delivery_address_enc) : null,
    city: pii?.city ?? null,
    pincode: pii?.pincode ?? null,
    dob_day: pii?.dob_day ?? null,
    dob_month: pii?.dob_month ?? null,
    notes: pii?.notes ?? null,
  };
}

/** Resolves dob_day/dob_month from either explicit fields or an ISO date (year discarded). */
function resolveDob(data: Partial<EmployeeFormData>): {
  dob_day: number | null;
  dob_month: number | null;
} | null {
  if (data.dob_day !== undefined || data.dob_month !== undefined) {
    return {
      dob_day: data.dob_day == null ? null : Number(data.dob_day) || null,
      dob_month: data.dob_month == null ? null : Number(data.dob_month) || null,
    };
  }
  if (data.date_of_birth !== undefined) {
    const iso = (data.date_of_birth ?? "").trim();
    if (iso === "") return { dob_day: null, dob_month: null };
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      return { dob_day: d.getDate(), dob_month: d.getMonth() + 1 };
    }
  }
  return null;
}

/** employees (identity) row from form data. `department` name is intentionally NOT persisted (Prompt 5). */
function toIdentityRow(data: Partial<EmployeeFormData>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.name !== undefined) row.full_name = data.name.trim();
  if (data.email !== undefined) row.email = data.email.trim().toLowerCase();
  const map: [keyof EmployeeFormData, string][] = [
    ["employee_code", "employee_code"],
    ["designation", "designation"],
    ["joining_date", "joining_date"],
    ["manager_name", "manager_name"],
    ["manager_email", "manager_email"],
    ["tshirt_size", "tshirt_size"],
    ["dietary_preference", "dietary_preference"],
    ["hobbies", "hobbies"],
    ["interests", "interests"],
  ];
  for (const [formKey, col] of map) {
    const value = clean(data[formKey] as string | undefined);
    if (value !== undefined) row[col] = value;
  }
  if (data.department_id !== undefined) row.department_id = data.department_id ?? null;
  return row;
}

/** employee_pii row from form data, encrypting phone + delivery_address. */
async function toPiiRow(data: Partial<EmployeeFormData>): Promise<Record<string, unknown>> {
  const row: Record<string, unknown> = {};
  if (data.phone !== undefined) row.phone_enc = await encryptPIINullable(data.phone);
  if (data.delivery_address !== undefined)
    row.delivery_address_enc = await encryptPIINullable(data.delivery_address);
  if (data.city !== undefined) row.city = clean(data.city);
  if (data.pincode !== undefined) row.pincode = clean(data.pincode);
  const dob = resolveDob(data);
  if (dob) {
    row.dob_day = dob.dob_day;
    row.dob_month = dob.dob_month;
  }
  return row;
}

export interface ListEmployeesOptions {
  search?: string;
  departmentId?: string;
  isActive?: boolean;
  sortBy?: "name" | "joining_date";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function listEmployees(
  companyId: string,
  options: ListEmployeesOptions = {},
): Promise<{ employees: Employee[]; total: number }> {
  const {
    search,
    departmentId,
    isActive,
    sortBy = "name",
    sortOrder = "asc",
    page = 1,
    pageSize = 25,
  } = options;

  const supabase = await createClient();
  // Identity only — the list does not expose PII (view_pii is gated per-detail).
  let query = supabase
    .from("employees")
    .select(IDENTITY_COLS, { count: "exact" })
    .eq("company_id", companyId);

  if (typeof isActive === "boolean") query = query.eq("is_active", isActive);
  if (departmentId) query = query.eq("department_id", departmentId);
  if (search) {
    const term = search.replace(/[%,]/g, " ").trim();
    query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  }

  const sortCol = sortBy === "name" ? "full_name" : sortBy;
  query = query.order(sortCol, { ascending: sortOrder === "asc" });

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  const employees = await Promise.all(
    ((data ?? []) as unknown as EmployeeRow[]).map((r) => mapRow({ ...r, pii: null })),
  );
  return { employees, total: count ?? 0 };
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select(`${IDENTITY_COLS}, ${PII_EMBED}`)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return mapRow(data as unknown as EmployeeRow);
}

export async function createEmployee(
  companyId: string,
  data: EmployeeFormData,
  createdBy: string,
): Promise<Employee> {
  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("employees")
    .insert({ ...toIdentityRow(data), company_id: companyId, created_by: createdBy, is_active: true })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const employeeId = created.id as string;

  // 1:1 PII row (always created; phone/address encrypted).
  const piiRow = await toPiiRow(data);
  const { error: piiErr } = await supabase
    .from("employee_pii")
    .insert({ ...piiRow, employee_id: employeeId, company_id: companyId });
  if (piiErr) {
    // Roll back the orphaned identity row so the 1:1 invariant holds.
    await supabase.from("employees").delete().eq("id", employeeId);
    throw new Error(piiErr.message);
  }

  const full = await getEmployee(employeeId);
  if (!full) throw new Error("Employee created but not readable");
  return full;
}

export async function updateEmployee(
  id: string,
  data: Partial<EmployeeFormData> & { is_active?: boolean },
): Promise<Employee> {
  const supabase = await createClient();

  const identity = toIdentityRow(data);
  if (typeof data.is_active === "boolean") identity.is_active = data.is_active;
  if (Object.keys(identity).length > 0) {
    const { error } = await supabase.from("employees").update(identity).eq("id", id);
    if (error) throw new Error(error.message);
  }

  const piiRow = await toPiiRow(data);
  if (Object.keys(piiRow).length > 0) {
    const { data: updatedPii, error: piiErr } = await supabase
      .from("employee_pii")
      .update(piiRow)
      .eq("employee_id", id)
      .select("employee_id")
      .maybeSingle();
    if (piiErr) throw new Error(piiErr.message);
    if (!updatedPii) {
      // No PII row yet (legacy) — create it, needs company_id.
      const { data: emp } = await supabase
        .from("employees")
        .select("company_id")
        .eq("id", id)
        .maybeSingle();
      if (emp?.company_id) {
        await supabase
          .from("employee_pii")
          .insert({ ...piiRow, employee_id: id, company_id: emp.company_id });
      }
    }
  }

  const full = await getEmployee(id);
  if (!full) throw new Error("Employee updated but not readable");
  return full;
}

/** Soft delete — deactivate. (PII purge is handled by offboarding — Prompt 4b.) */
export async function deleteEmployee(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({ is_active: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function bulkCreateEmployees(
  companyId: string,
  employees: EmployeeFormData[],
  createdBy: string,
): Promise<{
  created: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}> {
  const supabase = await createClient();
  const errors: Array<{ row: number; error: string }> = [];

  const { data: existing } = await supabase
    .from("employees")
    .select("email")
    .eq("company_id", companyId);
  const existingEmails = new Set(
    (existing ?? []).map((e) => (e.email as string)?.toLowerCase()),
  );

  const toInsert: Array<{ identity: Record<string, unknown>; source: EmployeeFormData }> = [];
  let skipped = 0;
  const seen = new Set<string>();

  employees.forEach((emp, index) => {
    const email = emp.email?.trim().toLowerCase();
    if (!email) {
      errors.push({ row: index + 1, error: "Missing email" });
      return;
    }
    if (existingEmails.has(email) || seen.has(email)) {
      skipped += 1;
      return;
    }
    seen.add(email);
    toInsert.push({
      identity: { ...toIdentityRow(emp), company_id: companyId, created_by: createdBy, is_active: true },
      source: emp,
    });
  });

  let created = 0;
  if (toInsert.length > 0) {
    const { data: insertedRows, error } = await supabase
      .from("employees")
      .insert(toInsert.map((t) => t.identity))
      .select("id, email");
    if (error) {
      errors.push({ row: 0, error: error.message });
    } else {
      created = insertedRows?.length ?? 0;
      // Build PII rows keyed by the returned ids (matched on email).
      const idByEmail = new Map(
        (insertedRows ?? []).map((r) => [(r.email as string)?.toLowerCase(), r.id as string]),
      );
      const piiRows: Record<string, unknown>[] = [];
      for (const t of toInsert) {
        const employeeId = idByEmail.get(t.source.email.trim().toLowerCase());
        if (!employeeId) continue;
        piiRows.push({
          ...(await toPiiRow(t.source)),
          employee_id: employeeId,
          company_id: companyId,
        });
      }
      if (piiRows.length > 0) {
        const { error: piiErr } = await supabase.from("employee_pii").insert(piiRows);
        if (piiErr) errors.push({ row: 0, error: `PII insert: ${piiErr.message}` });
      }
    }
  }

  return { created, skipped, errors };
}

export async function getEmployeesByDepartment(
  companyId: string,
): Promise<Array<{ department: string; count: number }>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select(`department_id, ${DEPT_EMBED}`)
    .eq("company_id", companyId)
    .eq("is_active", true);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as unknown as Array<{ department: DeptRel | null }>) {
    const dept = row.department?.name ?? "Unassigned";
    counts.set(dept, (counts.get(dept) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getDepartmentList(companyId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("departments")
    .select("name")
    .eq("company_id", companyId)
    .order("name", { ascending: true });
  return ((data ?? []) as Array<{ name: string | null }>)
    .map((d) => d.name)
    .filter((n): n is string => Boolean(n));
}

export async function getEmployeeCount(companyId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("is_active", true);
  return count ?? 0;
}

/** Days until the next anniversary of an ISO date (0 = today). */
function daysUntilNext(dateStr: string): number {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

/** Days until the next occurrence of a (month, day) — no year needed. */
function daysUntilNextDM(month: number, day: number): number {
  if (!month || !day) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(today.getFullYear(), month - 1, day);
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

export async function getUpcomingBirthdays(
  companyId: string,
  days: number,
): Promise<Employee[]> {
  const supabase = await createClient();
  // dob lives in employee_pii (RLS-gated); embed it and filter in JS.
  const { data } = await supabase
    .from("employees")
    .select(`${IDENTITY_COLS}, ${PII_EMBED}`)
    .eq("company_id", companyId)
    .eq("is_active", true);
  const mapped = await Promise.all(
    ((data ?? []) as unknown as EmployeeRow[]).map((r) => mapRow(r)),
  );
  return mapped
    .filter((e) => e.dob_month && daysUntilNextDM(e.dob_month, e.dob_day ?? 1) <= days)
    .sort(
      (a, b) =>
        daysUntilNextDM(a.dob_month!, a.dob_day ?? 1) -
        daysUntilNextDM(b.dob_month!, b.dob_day ?? 1),
    );
}

export async function getUpcomingAnniversaries(
  companyId: string,
  days: number,
): Promise<Employee[]> {
  const supabase = await createClient();
  // joining_date stays on employees — no PII embed needed.
  const { data } = await supabase
    .from("employees")
    .select(IDENTITY_COLS)
    .eq("company_id", companyId)
    .eq("is_active", true)
    .not("joining_date", "is", null);
  const mapped = await Promise.all(
    ((data ?? []) as unknown as EmployeeRow[]).map((r) => mapRow({ ...r, pii: null })),
  );
  return mapped
    .filter((e) => e.joining_date && daysUntilNext(e.joining_date) <= days)
    .sort((a, b) => daysUntilNext(a.joining_date!) - daysUntilNext(b.joining_date!));
}
