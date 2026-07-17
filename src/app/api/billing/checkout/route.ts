import { NextResponse } from "next/server";
import { requireTenant, apiAuthErrorResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRazorpayConfigured } from "@/lib/services/razorpay";
import { createProCheckout } from "@/lib/engines/subscription";

export const runtime = "nodejs";

/**
 * POST /api/billing/checkout — a billing-capable tenant (owner/admin/finance per
 * §6A `billing.manage`) initiates a Pro subscription. Creates a `created`
 * subscription row + a test-mode Razorpay order server-side and returns the
 * checkout handle. hr/manager/viewer are DENIED (403) by the matrix gate.
 *
 * The response carries only the PUBLIC Razorpay key id — the key SECRET never
 * leaves the server. This endpoint grants NO plan change; Pro is granted only
 * by the signature-verified webhook after payment.
 */
export async function POST() {
  try {
    const principal = await requireTenant("billing.manage", null);
    const companyId = principal.company_id;
    if (!companyId) {
      return NextResponse.json(
        { error: "no_company", message: "No company membership." },
        { status: 400 },
      );
    }

    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        { error: "not_configured", message: "Payments are not available right now." },
        { status: 503 },
      );
    }

    const userClient = await createClient();
    const admin = createAdminClient();
    const handle = await createProCheckout(userClient, admin, {
      companyId,
      createdBy: principal.id,
    });

    return NextResponse.json({
      data: {
        subscriptionId: handle.subscriptionId,
        orderId: handle.orderId,
        amount: handle.amount,
        currency: handle.currency,
        keyId: handle.keyId,
      },
    });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[billing/checkout]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not start checkout." },
      { status: 500 },
    );
  }
}
