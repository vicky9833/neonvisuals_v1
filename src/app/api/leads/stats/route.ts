import { NextResponse } from "next/server";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import { getLeadStats } from "@/lib/engines/lead";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireApiRole(["super_admin"]);
    const stats = await getLeadStats();
    return NextResponse.json({ data: stats });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[leads/stats]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not load lead stats. Please try again." },
      { status: 500 },
    );
  }
}
