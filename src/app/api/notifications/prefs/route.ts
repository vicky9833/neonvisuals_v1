import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Per-user notification preferences (Prompt 6a). RLS `notification_prefs_own`
 * (user_id = auth.uid()) scopes reads/writes to the caller. Absent row = default
 * (in_app=true, email=true, digest='immediate') — the engine honours the default
 * when no row exists, so we only persist explicit overrides.
 *
 * NOTE: the visual prefs toggle UI is deferred to a follow-on; this endpoint
 * makes prefs settable/honoured now (the engine reads the table directly).
 */
export async function GET() {
  try {
    await requireApiAuth();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notification_prefs")
      .select("type, in_app, email, digest_frequency");
    if (error) {
      return NextResponse.json({ error: "list_failed", message: error.message }, { status: 400 });
    }
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[notifications/prefs GET]", err);
    return NextResponse.json({ error: "server_error", message: "Could not load preferences." }, { status: 500 });
  }
}

const schema = z.object({
  type: z.string().min(1).max(64),
  in_app: z.boolean().optional(),
  email: z.boolean().optional(),
  digest_frequency: z.enum(["immediate", "daily", "weekly", "off"]).optional(),
});

export async function PATCH(request: Request) {
  try {
    const principal = await requireApiAuth();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    const { type, ...rest } = parsed.data;
    const supabase = await createClient();
    // Upsert the caller's own pref row (user_id from the session, never the body).
    const { data, error } = await supabase
      .from("notification_prefs")
      .upsert(
        { user_id: principal.id, type, ...rest },
        { onConflict: "user_id,type" },
      )
      .select("type, in_app, email, digest_frequency")
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: "update_failed", message: error.message }, { status: 400 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[notifications/prefs PATCH]", err);
    return NextResponse.json({ error: "server_error", message: "Could not update preferences." }, { status: 500 });
  }
}
