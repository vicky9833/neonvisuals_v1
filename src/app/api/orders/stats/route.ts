import { NextResponse } from "next/server";
import {
  requireApiAuth,
  auditCrossTenantAccess,
  apiAuthErrorResponse,
} from "@/lib/api-auth";
import { getOrderStats } from "@/lib/engines/order";

export const runtime = "nodejs";

// GET - order stats. Admin: full (with revenue). Client: counts only.
export async function GET() {
  try {
    const profile = await requireApiAuth();
    const isAdmin = profile.isPlatformStaff;

    if (!isAdmin && !profile.company_id) {
      return NextResponse.json({
        data: { total: 0, byStatus: {}, thisMonth: 0, lastMonth: 0 },
      });
    }
    if (isAdmin) {
      await auditCrossTenantAccess(profile, "platform.orders.manage", {
        entity: "order",
        action: "order.stats",
      });
    }

    const stats = await getOrderStats(
      isAdmin ? undefined : profile.company_id!,
    );

    if (isAdmin) {
      return NextResponse.json({ data: stats });
    }
    // Client: strip revenue fields.
    return NextResponse.json({
      data: {
        total: stats.total,
        byStatus: stats.byStatus,
        thisMonth: stats.thisMonth,
        lastMonth: stats.lastMonth,
      },
    });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[orders/stats]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not load order stats. Please try again." },
      { status: 500 },
    );
  }
}
