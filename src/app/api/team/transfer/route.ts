import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";

export const runtime = "nodejs";

/**
 * Owner transfer (Prompt 3b item 3). Calls the SECURITY DEFINER
 * transfer_ownership RPC under the CALLER'S OWN session — the RPC is the gate
 * (auth.uid() must be the active org_owner; company derived, not passed). Never
 * the service-role client.
 */
const schema = z.object({ targetUserId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    await requireApiAuth(); // must be authenticated; the RPC enforces owner-only
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input", message: "A target member is required." }, { status: 400 });
    }
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("transfer_ownership", { target_user_id: parsed.data.targetUserId });
    if (error) {
      // RPC raises 'TRANSFER: ...' with a user-safe reason.
      const msg = error.message?.replace(/^TRANSFER:\s*/, "") ?? "Transfer failed.";
      return NextResponse.json({ error: "transfer_denied", message: msg }, { status: 403 });
    }
    return NextResponse.json({ data: { companyId: data } });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[team/transfer]", err);
    return NextResponse.json({ error: "server_error", message: "Could not transfer ownership." }, { status: 500 });
  }
}
