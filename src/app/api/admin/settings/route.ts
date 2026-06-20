import { NextResponse } from "next/server";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import { getSettings, saveSettings, type SystemSettings } from "@/lib/admin/settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireApiRole(["super_admin"]);
    const settings = await getSettings();
    return NextResponse.json({ data: settings });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "get_failed", message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const profile = await requireApiRole(["super_admin"]);
    const body = (await request.json()) as SystemSettings;
    // Merge with current to be safe, then persist.
    const current = await getSettings();
    const merged: SystemSettings = {
      company: { ...current.company, ...(body.company ?? {}) },
      notifications: { ...current.notifications, ...(body.notifications ?? {}) },
      branding: { ...current.branding, ...(body.branding ?? {}) },
    };
    const saved = await saveSettings(merged, profile.id);
    return NextResponse.json({ data: saved });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "save_failed", message }, { status: 500 });
  }
}
