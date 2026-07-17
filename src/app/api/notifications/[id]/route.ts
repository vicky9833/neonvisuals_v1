import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const schema = z.object({ action: z.enum(["read", "unread"]).default("read") });

/**
 * Mark a single notification read/unread (Prompt 6a). RLS
 * `notifications_update_own` guarantees the caller can only mutate their own
 * row — the `.eq("id", id)` narrows within that scope.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAuth();
    const { id } = await params;
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input", message: "Invalid action." }, { status: 400 });
    }
    const read_at = parsed.data.action === "read" ? new Date().toISOString() : null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at })
      .eq("id", id)
      .select("id, read_at")
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: "update_failed", message: error.message }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ error: "not_found", message: "Notification not found." }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[notifications/:id PATCH]", err);
    return NextResponse.json({ error: "server_error", message: "Could not update notification." }, { status: 500 });
  }
}
