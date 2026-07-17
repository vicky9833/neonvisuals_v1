import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenant, apiAuthErrorResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConciergeRequest, addConciergeMessage } from "@/lib/engines/concierge";
import { notifyConciergeReply } from "@/lib/engines/notifications";

export const runtime = "nodejs";

const schema = z.object({ body: z.string().min(1).max(5000) });

/** POST /api/concierge/[id]/messages — TENANT posts a reply (sender_type=tenant). RLS own-company. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const principal = await requireTenant("concierge.raise", null);
    const { id } = await params;
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid_input", message: "A reply body is required." }, { status: 400 });

    const userClient = await createClient();
    const req = await getConciergeRequest(userClient, id); // RLS: null if not this company
    if (!req || req.company_id !== principal.company_id) return NextResponse.json({ error: "not_found", message: "Request not found." }, { status: 404 });

    const msg = await addConciergeMessage(userClient, { requestId: id, senderUserId: principal.id, senderType: "tenant", body: parsed.data.body });

    try {
      const admin = createAdminClient();
      const { data: company } = await admin.from("companies").select("name").eq("id", req.company_id).maybeSingle();
      await notifyConciergeReply(admin, {
        requestId: id, companyId: req.company_id, orgName: (company?.name as string) ?? "A company",
        senderType: "tenant", requesterUserId: req.raised_by, assignedStaffId: req.assigned_staff_id, messageId: msg.id,
      });
    } catch (e) { console.error("[concierge reply tenant] notify failed:", e); }

    return NextResponse.json({ data: msg }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[concierge/[id]/messages POST]", err);
    return NextResponse.json({ error: "server_error", message: "Could not post the reply." }, { status: 500 });
  }
}
