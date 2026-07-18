import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext, authorizeTenant } from "@/lib/authz/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/shared/page-header";
import { getCompanyPlanContext } from "@/lib/employees/queries";
import { isProPlan } from "@/lib/employees/plan-gate";
import { listDepartments } from "@/lib/departments/queries";
import {
  DepartmentsManager,
  type DepartmentRowView,
  type MemberOption,
} from "@/components/dashboard/DepartmentsManager";

export const metadata: Metadata = {
  title: "Departments",
  description: "Organise your team into departments and assign managers.",
  robots: { index: false, follow: false },
};

export default async function DepartmentsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login?redirect=%2Fdashboard%2Fsettings%2Fdepartments");
  const companyId = ctx.activeCompanyId;
  if (!companyId) redirect("/onboarding");

  const canManage = authorizeTenant(ctx, companyId, "settings.manage").effect === "allow";
  const plan = await getCompanyPlanContext(companyId);
  // P9b §R3: route through isProPlan so a demo org (is_demo) is Pro across the UI too, not just the API.
  const isPro = ctx.isPlatformStaff || isProPlan(plan);

  const departments = isPro ? await listDepartments(companyId) : [];

  const admin = createAdminClient();
  const { data: members } = await admin
    .from("company_members")
    .select("user_id, role")
    .eq("company_id", companyId)
    .eq("status", "active");
  const ids = (members ?? []).map((m) => m.user_id as string);
  const { data: profiles } = ids.length
    ? await admin.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] as { id: string; full_name: string; email: string }[] };
  const profById = new Map((profiles ?? []).map((p) => [p.id as string, p]));
  const memberOptions: MemberOption[] = (members ?? []).map((m) => ({
    userId: m.user_id as string,
    label: (profById.get(m.user_id as string)?.full_name as string) || (profById.get(m.user_id as string)?.email as string) || "Member",
    role: m.role as string,
  }));

  const rows: DepartmentRowView[] = departments.map((d) => ({
    id: d.id,
    name: d.name,
    managerId: d.manager_id,
    employeeCount: d.employee_count,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Group employees by department and assign a manager for own-department access."
      />
      <DepartmentsManager
        rows={rows}
        members={memberOptions}
        canManage={canManage}
        isPro={isPro}
      />
    </div>
  );
}
