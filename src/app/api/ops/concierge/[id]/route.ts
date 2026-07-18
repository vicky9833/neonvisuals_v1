import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatform, apiAuthErrorResponse } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConciergeRequest, assignConciergeRequest, setConciergeStatus, CONCIERGE_STATUSES, type ConciergeStatus } from "@/lib/engines/concierge";
import { canAssignConcierge } from "@/lib/employees/plan-gate";

export const runtime = "nodejs";

const schema = z.object({
  assignedStaffId: z.string().uuid().nullable().optional(),
  status: z.enum(["open", "awaiting_ops", "awaiting_customer", "resolved", "closed"]).optional(),
}).refine((v) => v.assignedStaffId !== undefined || v.status !== undefined, { message: "Provide assignedStaffId and/or status." });

/**
 * PATCH /api/ops/concierge/[id] — OPS assigns and/or sets status. Cross-org (platform plane).
 * Assignment is Pro-tier (dedicated); a Free company's request stays in the shared queue (assign
 * denied by plan). Gated by `platform.concierge.inbox`.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const principal = await requirePlatform("platform.concierge.inbox", { entity: "concierge", action: "concierge.update" });
    const { id } = await params;
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });

    const admin = createAdminClient();
    const req = await getConciergeRequest(admin, id);
    if (!req) return NextResponse.json({ error: "not_found", message: "Request not found." }, { status: 404 });

    if (parsed.data.assignedStaffId !== undefined) {
      // §8 plan tiering: Pro companies get a dedicated (assignable) concierge owner; Free/lapsed
      // stay in the shared queue — UNLESS §0 platform-staff bypass applies (8c-ii): an authorized
      // staffer may assign on any tier.
      const { data: company } = await admin.from("companies").select("plan, plan_override_by").eq("id", req.company_id).maybeSingle();
      const assignable = canAssignConcierge({ plan: (company?.plan as string | null) ?? null, planOverrideBy: (company?.plan_override_by as string | null) ?? null, isPlatformStaff: principal.isPlatformStaff });
      if (!assignable) {
        return NextResponse.json({ error: "shared_queue", message: "This company is on the shared concierge queue. Dedicated assignment is a Pro feature." }, { status: 422 });
      }
      await assignConciergeRequest(admin, id, parsed.data.assignedStaffId);
    }
    if (parsed.data.status !== undefined && CONCIERGE_STATUSES.includes(parsed.data.status as ConciergeStatus)) {
      await setConciergeStatus(admin, id, parsed.data.status as ConciergeStatus);
    }

    const updated = await getConciergeRequest(admin, id);
    return NextResponse.json({ data: updated });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[ops/concierge/[id] PATCH]", err);
    return NextResponse.json({ error: "server_error", message: "Could not update the request." }, { status: 500 });
  }
}
