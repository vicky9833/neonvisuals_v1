import { NextResponse } from "next/server";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processApproval } from "@/lib/engines/approval-service";

export const runtime = "nodejs";

/**
 * POST /api/quotes/[id]/reject — reject a quote pending approval (Prompt 7b).
 *
 * Requires the quote.approve capability (allow) — a sufficient approver. On reject:
 *   approval_status = 'rejected' AND the 7a gift-state reversal fires (rejected + no linked order
 *   -> clearGiftChosenForQuote -> escalation resumes). Free plan -> non-error "not_applicable".
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const principal = await requireApiAuth();
    const { id } = await params;
    const userClient = await createClient();
    const admin = createAdminClient();

    const outcome = await processApproval({ userClient, admin, principal, quoteId: id, action: "reject" });

    switch (outcome.kind) {
      case "rejected":
        return NextResponse.json({
          data: { id, approval_status: "rejected", gift_state_cleared: outcome.giftCleared },
        });
      case "not_applicable":
        return NextResponse.json({
          data: { id, applicable: false, reason: outcome.reason },
          message: "Approvals are a Pro feature; this quote has no approval step.",
        });
      case "not_found":
        return NextResponse.json({ error: "not_found", message: "Quote not found." }, { status: 404 });
      case "forbidden":
        return NextResponse.json({ error: "forbidden", message: outcome.reason }, { status: 403 });
      // reject never routes / no_approver / approved
      default:
        return NextResponse.json({ error: "server_error", message: "Unexpected outcome." }, { status: 500 });
    }
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[quotes/reject]", err);
    return NextResponse.json({ error: "server_error", message: "Could not reject the quote." }, { status: 500 });
  }
}
