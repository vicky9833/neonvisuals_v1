import { NextResponse } from "next/server";
import { requirePlatform, apiAuthErrorResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAllConciergeRequests, type ConciergeStatus } from "@/lib/engines/concierge";

export const runtime = "nodejs";

/**
 * GET /api/ops/concierge — the §6C cross-org concierge inbox: ALL requests across ALL companies in
 * one queue. Gated by `platform.concierge.inbox` (owner/admin/ops/support; finance denied). Uses
 * the service-role client (platform plane sees all orgs) behind the platform capability gate.
 */
export async function GET(request: Request) {
  try {
    await requirePlatform("platform.concierge.inbox", { entity: "concierge", action: "concierge.inbox.list" });
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") as ConciergeStatus | null) ?? undefined;
    const admin = createAdminClient();
    const requests = await listAllConciergeRequests(admin, { status });
    return NextResponse.json({ data: { requests } });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[ops/concierge GET]", err);
    return NextResponse.json({ error: "server_error", message: "Could not load the concierge inbox." }, { status: 500 });
  }
}
