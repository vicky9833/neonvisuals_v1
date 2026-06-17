import { NextResponse, type NextRequest } from "next/server";
import { leadSchema } from "@/lib/utils/validators";

/** Lists leads (admin) — persistence wired in a later task. */
export async function GET() {
  return NextResponse.json({ data: [] });
}

/** Accepts a new lead / quote request. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = leadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid input",
      },
      { status: 400 },
    );
  }

  // TODO: persist lead and notify the team via Resend.
  return NextResponse.json({ data: { received: true } });
}
