import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import {
  markReminderActioned,
  markReminderDismissed,
  markReminderRead,
} from "@/lib/engines/occasions";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  action: z.enum(["read", "dismissed", "actioned"]),
});

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    await requireApiAuth();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    if (parsed.data.action === "read") await markReminderRead(id);
    else if (parsed.data.action === "dismissed") await markReminderDismissed(id);
    else await markReminderActioned(id);
    return NextResponse.json({ data: { id, action: parsed.data.action } });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[reminders/[id]]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to update reminder." },
      { status: 500 },
    );
  }
}
