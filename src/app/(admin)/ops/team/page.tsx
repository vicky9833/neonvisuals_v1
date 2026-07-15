import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { TeamList, type TeamMember } from "@/components/admin/TeamList";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Team" };

export const dynamic = "force-dynamic";

export default async function OpsTeamPage() {
  // Platform team = platform_staff (Prompt 2 item 4), NOT profiles.role.
  const supa = createAdminClient();
  const { data: staff } = await supa
    .from("platform_staff")
    .select("user_id, role, created_at")
    .order("created_at", { ascending: true });

  const ids = (staff ?? []).map((s) => s.user_id as string);
  const byId = new Map<string, { full_name: string; email: string; avatar_url: string | null }>();
  if (ids.length > 0) {
    const { data: profiles } = await supa
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .in("id", ids);
    for (const p of profiles ?? []) {
      byId.set(p.id as string, {
        full_name: (p.full_name as string) ?? "",
        email: (p.email as string) ?? "",
        avatar_url: (p.avatar_url as string | null) ?? null,
      });
    }
  }

  const members: TeamMember[] = (staff ?? []).map((s) => ({
    id: s.user_id as string,
    full_name: byId.get(s.user_id as string)?.full_name ?? "",
    email: byId.get(s.user_id as string)?.email ?? "",
    role: s.role as string,
    avatar_url: byId.get(s.user_id as string)?.avatar_url ?? null,
    created_at: s.created_at as string,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team Members"
        description="Manage Neon Visuals platform staff and their platform roles."
      />
      <TeamList members={members} />
    </div>
  );
}
