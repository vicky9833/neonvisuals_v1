import { NextResponse } from "next/server";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { generateReminders, getActiveReminders } from "@/lib/engines/occasions";

export const runtime = "nodejs";

export async function GET() {
  try {
    const profile = await requireApiAuth();
    if (!profile.company_id) return NextResponse.json({ data: [] });
    const reminders = await getActiveReminders(profile.company_id);
    return NextResponse.json({ data: reminders });
  } catch (err) {
    return handle(err, "reminders_failed");
  }
}

export async function POST() {
  try {
    const profile = await requireApiAuth();
    if (!profile.company_id) {
      return NextResponse.json(
        { error: "no_company", message: "No company linked." },
        { status: 400 },
      );
    }
    const result = await generateReminders(profile.company_id);
    return NextResponse.json({ data: result });
  } catch (err) {
    return handle(err, "generate_failed");
  }
}

function handle(err: unknown, code: string): NextResponse {
  const authResponse = apiAuthErrorResponse(err);
  if (authResponse) return authResponse;
  console.error("[reminders]", err);
  return NextResponse.json(
    { error: code, message: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
