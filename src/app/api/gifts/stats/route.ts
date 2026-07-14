import { NextResponse } from "next/server";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { getCompanyGiftStats } from "@/lib/engines/memory";

export const runtime = "nodejs";

export async function GET() {
  try {
    const profile = await requireApiAuth();
    if (!profile.company_id) {
      return NextResponse.json({
        data: {
          totalGiftsSent: 0,
          totalEmployeesGifted: 0,
          avgGiftsPerEmployee: 0,
          topProducts: [],
          topOccasions: [],
          overallDeskTestScore: 0,
          overallReactionScore: 0,
          giftsByMonth: [],
        },
      });
    }
    const stats = await getCompanyGiftStats(profile.company_id);
    return NextResponse.json({ data: stats });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[gifts/stats]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to load gift stats." },
      { status: 500 },
    );
  }
}
