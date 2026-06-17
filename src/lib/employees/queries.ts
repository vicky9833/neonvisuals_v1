import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Employee, EmployeeFormData } from "@/types/employee";

/**
 * Company-scoped employee data access. Uses the request-scoped (cookie)
 * Supabase client so RLS enforces company isolation as a second line of
 * defence on top of the explicit company_id filters.
 *
 * Column mapping: the table stores `full_name`; the app uses `name`. We alias
 * on read (`name:full_name`) and translate on write.
 */

const COLS =
  "id, company_id, name:full_name, email, employee_code, phone, department, designation, date_of_birth, joining_date, manager_name, manager_email, tshirt_size, dietary_preference, hobbies, interests, delivery_address, city, pincode, is_active, notes, avatar_url, created_at, updated_at, created_by";

/** Maps form data → DB row, translating name→full_name and "" → null. */
function toRow(data: Partial<EmployeeFormData>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  const clean = (v: string | undefined) =>
    v === undefined ? undefined : v.trim() === "" ? null : v.trim();

  if (data.name !== undefined) row.full_name = data.name.trim();
  if (data.email !== undefined) row.email = data.email.trim().toLowerCase();
  const map: [keyof EmployeeFormData, string][] = [
    ["employee_code", "employee_code"],
    ["phone", "phone"],
    ["department", "department"],
    ["designation", "designation"],
    ["date_of_birth", "date_of_birth"],
    ["joining_date", "joining_date"],
    ["manager_name", "manager_name"],
    ["manager_email", "manager_email"],
    ["tshirt_size", "tshirt_size"],
    ["dietary_preference", "dietary_preference"],
    ["hobbies", "hobbies"],
    ["interests", "interests"],
    ["delivery_address", "delivery_address"],
    ["city", "city"],
    ["pincode", "pincode"],
  ];
  for (const [formKey, col] of map) {
    const value = clean(data[formKey] as string | undefined);
    if (value !== undefined) row[col] = value;
  }
  return row;
}

export interface ListEmployeesOptions {
  search?: string;
  department?: string;
  isActive?: boolean;
  sortBy?: "name" | "joining_date" | "department" | "date_of_birth";
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
    department,
    isActive,
    sortBy = "name",
    sortOrder = "asc",
    page = 1,
    pageSize = 25,
  } = options;

  const supabase = await createClient();
  let query = supabase
    .from("employees")
    .select(COLS, { count: "exact" })
    .eq("company_id", companyId);

  if (typeof isActive === "boolean") query = query.eq("is_active", isActive);
  if (department) query = query.eq("department", department);
  if (search) {
    const term = search.replace(/[%,]/g, " ").trim();
    query = query.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,department.ilike.%${term}%`,
    );
  }

  const sortCol = sortBy === "name" ? "full_name" : sortBy;
  query = query.order(sortCol, { ascending: sortOrder === "asc" });

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return {
    employees: (data ?? []) as unknown as Employee[],
    total: count ?? 0,
  };
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select(COLS)
    .eq("id", id)
    .single();
  return (data as unknown as Employee | null) ?? null;
}

export async function createEmployee(
  companyId: string,
  data: EmployeeFormData,
  createdBy: string,
): Promise<Employee> {
  const supabase = await createClient();
  const payload = {
    ...toRow(data),
    company_id: companyId,
    created_by: createdBy,
    is_active: true,
  };
  const { data: created, error } = await supabase
    .from("employees")
    .insert(payload)
    .select(COLS)
    .single();
  if (error) throw new Error(error.message);
  return created as unknown as Employee;
}

export async function updateEmployee(
  id: string,
  data: Partial<EmployeeFormData> & { is_active?: boolean },
): Promise<Employee> {
  const supabase = await createClient();
  const payload = toRow(data);
  if (typeof data.is_active === "boolean") payload.is_active = data.is_active;
  const { data: updated, error } = await supabase
    .from("employees")
    .update(payload)
    .eq("id", id)
    .select(COLS)
    .single();
  if (error) throw new Error(error.message);
  return updated as unknown as Employee;
}

/** Soft delete — deactivate. */
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

  // Existing emails in this company (to skip duplicates).
  const { data: existing } = await supabase
    .from("employees")
    .select("email")
    .eq("company_id", companyId);
  const existingEmails = new Set(
    (existing ?? []).map((e) => (e.email as string)?.toLowerCase()),
  );

  const toInsert: Record<string, unknown>[] = [];
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
      ...toRow(emp),
      company_id: companyId,
      created_by: createdBy,
      is_active: true,
    });
  });

  let created = 0;
  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from("employees")
      .insert(toInsert)
      .select("id");
    if (error) {
      errors.push({ row: 0, error: error.message });
    } else {
      created = data?.length ?? 0;
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
    .select("department")
    .eq("company_id", companyId)
    .eq("is_active", true);
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const dept = (row.department as string | null) ?? "Unassigned";
    counts.set(dept, (counts.get(dept) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getDepartmentList(
  companyId: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select("department")
    .eq("company_id", companyId)
    .not("department", "is", null);
  const set = new Set<string>();
  for (const row of data ?? []) {
    const dept = (row.department as string | null)?.trim();
    if (dept) set.add(dept);
  }
  return [...set].sort();
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

/** Days until the next anniversary of a month/day (0 = today). */
function daysUntilNext(dateStr: string): number {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

export async function getUpcomingBirthdays(
  companyId: string,
  days: number,
): Promise<Employee[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select(COLS)
    .eq("company_id", companyId)
    .eq("is_active", true)
    .not("date_of_birth", "is", null);
  return ((data ?? []) as unknown as Employee[])
    .filter((e) => e.date_of_birth && daysUntilNext(e.date_of_birth) <= days)
    .sort((a, b) => daysUntilNext(a.date_of_birth!) - daysUntilNext(b.date_of_birth!));
}

export async function getUpcomingAnniversaries(
  companyId: string,
  days: number,
): Promise<Employee[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select(COLS)
    .eq("company_id", companyId)
    .eq("is_active", true)
    .not("joining_date", "is", null);
  return ((data ?? []) as unknown as Employee[])
    .filter((e) => e.joining_date && daysUntilNext(e.joining_date) <= days)
    .sort((a, b) => daysUntilNext(a.joining_date!) - daysUntilNext(b.joining_date!));
}
