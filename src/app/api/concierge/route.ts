import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenant, requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createConciergeRequest, listCompanyConciergeRequests } from "@/lib/engines/concierge";
import { notifyConciergeRaised } from "@/lib/engines/notifications";
import { buildOpsWaLink } from "@/lib/utils/wa";

export const runtime = "nodejs";

const raiseSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  urgency: z.enum(["low", "normal", "high"]).optional(),
});

/** POST /api/concierge — tenant raises a concierge request (§4G). Gated by `concierge.raise`. */
export async function POST(request: Request) {
  try {
    const principal = await requireTenant("concierge.raise", null);
    const companyId = principal.company_id;
    if (!companyId) return NextResponse.json({ error: "no_company", message: "No company membership." }, { status: 400 });
    const parsed = raiseSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });

    const userClient = await createClient();
    const req = await createConciergeRequest(userClient, {
      companyId,
      raisedBy: principal.id,
      subject: parsed.data.subject,
      body: parsed.data.body,
      urgency: parsed.data.urgency ?? "normal",
    });

    // PII-safe ops-queue notification (org + request ref only) + wa.me deep link.
    try {
      const admin = createAdminClient();
      const { data: company } = await admin.from("companies").select("name, plan, primary_contact_name, primary_contact_phone").eq("id", companyId).maybeSingle();
      const orgName = (company?.name as string) ?? "A company";
      const waLink = buildOpsWaLink({
        clientPhone: (company?.primary_contact_phone as string | null) ?? null,
        orgName,
        plan: (company?.plan as string | null) ?? null,
        contactName: (company?.primary_contact_name as string | null) ?? null,
      });
      await notifyConciergeRaised(admin, { requestId: req.id, companyId, orgName, requesterUserId: principal.id, urgency: req.urgency, waLink });
    } catch (e) {
      console.error("[concierge] raise notify failed:", e);
    }

    return NextResponse.json({ data: req }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[concierge POST]", err);
    return NextResponse.json({ error: "server_error", message: "Could not raise the request." }, { status: 500 });
  }
}

/** GET /api/concierge — tenant lists their own company's requests (RLS own-company). */
export async function GET() {
  try {
    await requireApiAuth();
    const userClient = await createClient();
    const requests = await listCompanyConciergeRequests(userClient);
    return NextResponse.json({ data: { requests } });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[concierge GET]", err);
    return NextResponse.json({ error: "server_error", message: "Could not load requests." }, { status: 500 });
  }
}
