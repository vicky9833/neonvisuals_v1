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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "upcoming_failed", message }, { status: 500 });
  }
}
