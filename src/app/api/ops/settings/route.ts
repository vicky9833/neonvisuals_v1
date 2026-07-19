import { NextResponse } from "next/server";
import { requirePlatform, apiAuthErrorResponse } from "@/lib/api-auth";
import { getSettings, saveSettings, type SystemSettings } from "@/lib/admin/settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requirePlatform("platform.settings.manage", { entity: "settings", action: "settings.read" });
    const settings = await getSettings();
    return NextResponse.json({ data: settings });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[admin/settings]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to load settings." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const profile = await requirePlatform("platform.settings.manage", { entity: "settings", action: "settings.save" });
    const body = (await request
      .json()
      .catch(() => null)) as SystemSettings | null;
    if (body === null) {
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid JSON body." },
        { status: 400 },
      );
    }
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
    console.error("[admin/settings]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to save settings." },
      { status: 500 },
    );
  }
}
