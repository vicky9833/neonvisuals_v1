import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext, authorizeTenant } from "@/lib/authz/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/shared/page-header";
import { TeamManager, type TeamMemberRow } from "@/components/dashboard/TeamManager";

export const metadata: Metadata = {
  title: "Team",
  description: "Manage your organisation's members and roles.",
  robots: { index: false, follow: false },
};

export default async function TeamPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login?redirect=%2Fdashboard%2Fteam");
  const companyId = ctx.activeCompanyId;
  if (!companyId) redirect("/onboarding");

  // Management controls gate: owner/admin (matrix), not an ad-hoc check.
  const canManage = authorizeTenant(ctx, companyId, "members.change_role").effect === "allow";
  const canRemove = authorizeTenant(ctx, companyId, "members.invite").effect === "allow";
  const myRole = ctx.memberships.find((m) => m.companyId === companyId)?.role ?? "viewer";
  const isOwner = myRole === "org_owner";

  // Roster: scoped to the caller's OWN company (tenant isolation via companyId
  // derived from the verified membership). Admin client used only to resolve
  // teammate profile/department names (profiles RLS is per-user).
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("company_members")
    .select("user_id, role, department_id, status, joined_at, approval_limit")
    .eq("company_id", companyId)
    .order("joined_at", { ascending: true });

  const ids = (members ?? []).map((m) => m.user_id as string);
  const [{ data: profiles }, { data: depts }] = await Promise.all([
    ids.length ? admin.from("profiles").select("id, full_name, email").in("id", ids) : Promise.resolve({ data: [] as { id: string; full_name: string; email: string }[] }),
    admin.from("departments").select("id, name").eq("company_id", companyId),
  ]);
  const profById = new Map((profiles ?? []).map((p) => [p.id as string, p]));
  const deptById = new Map((depts ?? []).map((d) => [d.id as string, d.name as string]));

  const rows: TeamMemberRow[] = (members ?? []).map((m) => ({
    userId: m.user_id as string,
    name: (profById.get(m.user_id as string)?.full_name as string) ?? "",
    email: (profById.get(m.user_id as string)?.email as string) ?? "",
    role: m.role as string,
    department: m.department_id ? (deptById.get(m.department_id as string) ?? null) : null,
    status: m.status as string,
    approvalLimit: m.approval_limit == null ? null : Number(m.approval_limit),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Manage who has access to your organisation and what they can do."
      />
      <TeamManager
        rows={rows}
        canManage={canManage}
        canRemove={canRemove}
        isOwner={isOwner}
        currentUserId={ctx.userId}
      />
    </div>
  );
}
