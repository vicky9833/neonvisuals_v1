import { NextResponse } from "next/server";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * The authenticated user's OWN in-app notifications (Prompt 6a). RLS
 * (`notifications_read`: recipient_user_id = auth.uid()) is the isolation
 * boundary — a user can only ever read their own rows. Unread-first, newest
 * first. Returns the list + an unread count for the bell badge.
 */
export async function GET(request: Request) {
  try {
    await requireApiAuth();
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, body, link, read_at, company_id, created_at")
      .order("read_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      return NextResponse.json({ error: "list_failed", message: error.message }, { status: 400 });
    }

    const { count: unread } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);

    return NextResponse.json({ data: data ?? [], unread: unread ?? 0 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[notifications GET]", err);
    return NextResponse.json({ error: "server_error", message: "Could not load notifications." }, { status: 500 });
  }
}

/**
 * Mark ALL of the caller's unread notifications read (bell "mark all read").
 * RLS `notifications_update_own` scopes it to the caller's own rows.
 */
export async function PATCH() {
  try {
    await requireApiAuth();
    const supabase = await createClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    if (error) {
      return NextResponse.json({ error: "mark_failed", message: error.message }, { status: 400 });
    }
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[notifications PATCH]", err);
    return NextResponse.json({ error: "server_error", message: "Could not update notifications." }, { status: 500 });
  }
}
