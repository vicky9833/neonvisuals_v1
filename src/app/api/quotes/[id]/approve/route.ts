import { NextResponse } from "next/server";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processApproval } from "@/lib/engines/approval-service";

export const runtime = "nodejs";

/**
 * POST /api/quotes/[id]/approve — the P2 quote.approve conditional, finally invoked (Prompt 7b).
 *
 * The approval-service invokes tenantCapability("quote.approve", { amount }) and branches:
 *   - allow                 -> approval_status = 'approved'            (200)
 *   - at-most-limit deny     -> OVER-LIMIT routing to the next approver (200, status 'pending')
 *   - viewer/no membership   -> 403 forbidden
 *   - Free plan              -> 200 "not_applicable" (quote proceeds ungated — NOT an error)
 *   - quote not in company   -> 404
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const principal = await requireApiAuth();
    const { id } = await params;
    const userClient = await createClient();
    const admin = createAdminClient();

    const outcome = await processApproval({ userClient, admin, principal, quoteId: id, action: "approve" });

    switch (outcome.kind) {
      case "approved":
        return NextResponse.json({ data: { id, approval_status: "approved" } });
      case "routed":
        return NextResponse.json({
          data: { id, approval_status: "pending", routed_to: outcome.routedTo, emailed: outcome.emailed },
          message: "Over your approval limit — routed to the next approver.",
          ...(outcome.emailFailed ? { emailFailed: true } : {}),
        });
      case "not_applicable":
        return NextResponse.json({
          data: { id, applicable: false, reason: outcome.reason },
          message: "Approvals are a Pro feature; this quote proceeds without an approval step.",
        });
      case "no_approver":
        return NextResponse.json(
          { error: "no_approver", message: "No approver is available to escalate to." },
          { status: 409 },
        );
      case "not_found":
        return NextResponse.json({ error: "not_found", message: "Quote not found." }, { status: 404 });
      case "forbidden":
        return NextResponse.json({ error: "forbidden", message: outcome.reason }, { status: 403 });
    }
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[quotes/approve]", err);
    return NextResponse.json({ error: "server_error", message: "Could not approve the quote." }, { status: 500 });
  }
}
