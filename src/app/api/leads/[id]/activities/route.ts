import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import { addActivity, getActivities } from "@/lib/engines/lead";

export const runtime = "nodejs";

const schema = z.object({
  activityType: z.enum([
    "note",
    "call",
    "whatsapp",
    "email",
    "meeting",
    "proposal",
    "follow_up",
    "sample_sent",
    "status_change",
    "quote_created",
    "order_placed",
    "other",
  ]),
  title: z.string().min(1),
  description: z.string().optional(),
  outcome: z
    .enum(["positive", "neutral", "negative", "no_answer", "rescheduled"])
    .optional(),
  quoteId: z.string().uuid().optional(),
  followUpDate: z.string().optional(),
  followUpNote: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiRole(["super_admin"]);
    const { id } = await params;
    const activities = await getActivities(id);
    return NextResponse.json({ data: activities });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[leads/[id]/activities]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not load activities. Please try again." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireApiRole(["super_admin"]);
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid request body." },
        { status: 400 },
      );
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    const activity = await addActivity(id, parsed.data, profile.id);
    return NextResponse.json({ data: activity }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[leads/[id]/activities]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not add the activity. Please try again." },
      { status: 500 },
    );
  }
}
