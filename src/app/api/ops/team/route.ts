import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatform, apiAuthErrorResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Platform team management (Prompt 2 item 4): operates on `platform_staff`, NOT
 * profiles.role. Owner-only via the `platform.staff.manage` capability.
 * KEPT ELEVATED (service-role): reads/writes across the platform plane.
 */
const PLATFORM_ROLES = ["owner", "admin", "ops", "finance", "support"] as const;

export async function GET() {
  try {
    await requirePlatform("platform.staff.manage", { entity: "platform_staff", action: "staff.list" });
    const supa = createAdminClient();
    const { data: staff } = await supa
      .from("platform_staff")
      .select("user_id, role, created_at")
      .order("created_at", { ascending: true });

    const ids = (staff ?? []).map((s) => s.user_id as string);
    const profilesById = new Map<string, { full_name: string; email: string; avatar_url: string | null }>();
    if (ids.length > 0) {
      const { data: profiles } = await supa
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", ids);
      for (const p of profiles ?? []) {
        profilesById.set(p.id as string, {
          full_name: (p.full_name as string) ?? "",
          email: (p.email as string) ?? "",
          avatar_url: (p.avatar_url as string | null) ?? null,
        });
      }
    }

    const data = (staff ?? []).map((s) => {
      const p = profilesById.get(s.user_id as string);
      return {
        id: s.user_id as string,
        full_name: p?.full_name ?? "",
        email: p?.email ?? "",
        role: s.role as string,
        avatar_url: p?.avatar_url ?? null,
        created_at: s.created_at as string,
      };
    });
    return NextResponse.json({ data });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[ops/team]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to load team members." },
      { status: 500 },
    );
  }
}

const patchSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(PLATFORM_ROLES),
});

export async function PATCH(request: Request) {
  try {
    const profile = await requirePlatform("platform.staff.manage", {
      entity: "platform_staff",
      action: "staff.role_change",
    });
    const body = await request.json().catch(() => null);
    if (body === null) {
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid JSON body." },
        { status: 400 },
      );
    }
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    // Prevent owner self-demotion lockout.
    if (parsed.data.id === profile.id && parsed.data.role !== "owner") {
      return NextResponse.json(
        { error: "self_demote", message: "You cannot change your own owner role." },
        { status: 400 },
      );
    }
    const supa = createAdminClient();
    const { error } = await supa
      .from("platform_staff")
      .update({ role: parsed.data.role })
      .eq("user_id", parsed.data.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[ops/team]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to update team member." },
      { status: 500 },
    );
  }
}
