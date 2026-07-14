import { NextResponse } from "next/server";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { getCalendarEvents } from "@/lib/engines/occasions";
import type { CalendarEventType } from "@/types/occasion";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const profile = await requireApiAuth();
    if (!profile.company_id) return NextResponse.json({ data: [] });

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const start =
      searchParams.get("start") ??
      new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const end =
      searchParams.get("end") ??
      new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
    const type = searchParams.get("type") as CalendarEventType | null;

    let events = await getCalendarEvents(profile.company_id, start, end);
    if (type) events = events.filter((e) => e.type === type);
    return NextResponse.json({ data: events });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[occasions/calendar]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to load calendar events." },
      { status: 500 },
    );
  }
}
