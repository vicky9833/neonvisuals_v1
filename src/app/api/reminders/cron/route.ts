import { NextResponse } from "next/server";

/**
 * Cron entrypoint for automated occasion reminders (birthdays, work
 * anniversaries, festivals). Scheduling + processing wired in a later task.
 */
export async function GET() {
  return NextResponse.json({ data: { processed: 0 } });
}
