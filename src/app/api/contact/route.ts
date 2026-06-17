import { NextResponse, type NextRequest } from "next/server";
import { contactSchema } from "@/lib/utils/validators";

/** Accepts contact form submissions. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid input",
      },
      { status: 400 },
    );
  }

  // TODO: persist enquiry and notify the team via Resend.
  return NextResponse.json({ data: { received: true } });
}
