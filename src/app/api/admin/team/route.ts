import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireApiRole(["super_admin"]);
    const supa = createAdminClient();
    const { data } = await supa
      .from("profiles")
      .select("id, full_name, email, role, avatar_url, created_at")
      .in("role", ["super_admin", "admin"])
      .order("created_at", { ascending: true });
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[admin/team]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to load team members." },
      { status: 500 },
    );
  }
}

const patchSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["super_admin", "admin", "client"]),
});

export async function PATCH(request: Request) {
  try {
    const profile = await requireApiRole(["super_admin"]);
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
    // Prevent self-demotion lockout.
    if (parsed.data.id === profile.id && parsed.data.role !== "super_admin") {
      return NextResponse.json(
        { error: "self_demote", message: "You cannot change your own super_admin role." },
        { status: 400 },
      );
    }
    const supa = createAdminClient();
    const { error } = await supa
      .from("profiles")
      .update({ role: parsed.data.role })
      .eq("id", parsed.data.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[admin/team]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to update team member." },
      { status: 500 },
    );
  }
}
