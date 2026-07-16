import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Departments data access (Prompt 5a item 4). Departments CRUD activates 4a's
 * proven-but-inert own-dept manager RLS by populating real department data:
 *   - departments.manager_id          = who MANAGES the dept,
 *   - company_members.department_id    = which dept a MEMBER belongs to (the own-dept RLS key),
 *   - employees.department_id          = which dept an EMPLOYEE (gift recipient) is in.
 * CRUD uses the request-scoped RLS client (departments_manage = owner/admin). The
 * member.department_id sync uses the admin client (the route already authorized
 * owner/admin via the matrix) so assigning a manager also scopes their own-dept view.
 */

export interface DepartmentRow {
  id: string;
  name: string;
  manager_id: string | null;
  employee_count: number;
}

export async function listDepartments(companyId: string): Promise<DepartmentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .select("id, name, manager_id")
    .eq("company_id", companyId)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{ id: string; name: string; manager_id: string | null }>;
  // Employee counts per department (RLS-scoped).
  const { data: emps } = await supabase
    .from("employees")
    .select("department_id")
    .eq("company_id", companyId)
    .eq("is_active", true);
  const counts = new Map<string, number>();
  for (const e of (emps ?? []) as Array<{ department_id: string | null }>) {
    if (e.department_id) counts.set(e.department_id, (counts.get(e.department_id) ?? 0) + 1);
  }
  return rows.map((r) => ({ ...r, employee_count: counts.get(r.id) ?? 0 }));
}

export async function createDepartment(
  companyId: string,
  name: string,
  managerId: string | null,
): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .insert({ company_id: companyId, name: name.trim(), manager_id: managerId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  if (managerId) await syncManagerMembership(companyId, data.id as string, managerId);
  return { id: data.id as string };
}

export async function updateDepartment(
  companyId: string,
  id: string,
  patch: { name?: string; manager_id?: string | null },
): Promise<void> {
  const supabase = await createClient();
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.manager_id !== undefined) update.manager_id = patch.manager_id;
  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from("departments").update(update).eq("id", id).eq("company_id", companyId);
    if (error) throw new Error(error.message);
  }
  if (patch.manager_id) await syncManagerMembership(companyId, id, patch.manager_id);
}

export async function deleteDepartment(companyId: string, id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("departments").delete().eq("id", id).eq("company_id", companyId);
  if (error) throw new Error(error.message);
}

/**
 * Sets the manager's own-dept scope: company_members.department_id = the dept they
 * manage (in this company). Admin client — the route authorized owner/admin first.
 */
async function syncManagerMembership(companyId: string, deptId: string, managerUserId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("company_members")
    .update({ department_id: deptId })
    .eq("company_id", companyId)
    .eq("user_id", managerUserId);
}
