import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import {
  getFestivalPreferences,
  saveFestivalPreferences,
} from "@/lib/engines/occasions";

export const runtime = "nodejs";

const schema = z.object({
  preferences: z.array(
    z.object({
      festival_id: z.string().uuid(),
      is_active: z.boolean(),
      custom_date: z.string().nullable().optional(),
    }),
  ),
});

export async function GET() {
  try {
    const profile = await requireApiAuth();
    if (!profile.company_id) return NextResponse.json({ data: [] });
    const data = await getFestivalPreferences(profile.company_id);
    return NextResponse.json({ data });
  } catch (err) {
    return handle(err, "festivals_failed");
  }
}

export async function POST(request: Request) {
  try {
    const profile = await requireApiAuth();
    if (!profile.company_id) {
      return NextResponse.json(
        { error: "no_company", message: "No company linked." },
        { status: 400 },
      );
    }
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    await saveFestivalPreferences(profile.company_id, parsed.data.preferences);
    return NextResponse.json({ data: { saved: parsed.data.preferences.length } });
  } catch (err) {
    return handle(err, "save_failed");
  }
}

function handle(err: unknown, code: string): NextResponse {
  const authResponse = apiAuthErrorResponse(err);
  if (authResponse) return authResponse;
  console.error("[occasions/festivals]", err);
  return NextResponse.json(
    { error: code, message: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
