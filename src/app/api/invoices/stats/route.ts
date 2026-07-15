import { NextResponse } from "next/server";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { getBillingStats } from "@/lib/engines/billing";

export const runtime = "nodejs";

export async function GET() {
  try {
    const profile = await requireApiAuth();
    const isAdmin = profile.role === "super_admin";
    if (!isAdmin && !profile.company_id) {
      return NextResponse.json({
        data: {
          totalInvoiced: 0,
          totalCollected: 0,
          totalOutstanding: 0,
          overdueAmount: 0,
          overdueCount: 0,
          invoicesByStatus: {},
          collectionRate: 0,
          recentPayments: [],
        },
      });
    }
    const stats = await getBillingStats(
      isAdmin ? undefined : profile.company_id!,
    );
    return NextResponse.json({ data: stats });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[invoices/stats]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to load billing stats." },
      { status: 500 },
    );
  }
}
