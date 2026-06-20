import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { TeamList, type TeamMember } from "@/components/admin/TeamList";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Team" };

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const supa = createAdminClient();
  const { data } = await supa
    .from("profiles")
    .select("id, full_name, email, role, avatar_url, created_at")
    .in("role", ["super_admin", "admin"])
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team Members"
        description="Manage internal Neon Visuals accounts and roles."
      />
      <TeamList members={(data ?? []) as TeamMember[]} />
    </div>
  );
}
