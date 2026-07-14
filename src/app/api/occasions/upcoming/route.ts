import { NextResponse } from "next/server";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { getUpcomingEvents } from "@/lib/engines/occasions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const profile = await requireApiAuth();
    if (!profile.company_id) return NextResponse.json({ data: [] });
    const { searchParams } = new URL(request.url);
    const days = searchParams.get("days") ? Number(searchParams.get("days")) : 30;
    const events = await getUpcomingEvents(profile.company_id, days);
    return NextResponse.json({ data: events });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[occasions/upcoming]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to load upcoming events." },
      { status: 500 },
    );
  }
}
