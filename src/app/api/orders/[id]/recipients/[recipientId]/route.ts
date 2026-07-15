import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import {
  removeRecipient,
  updateRecipientStatus,
  type RecipientDeliveryStatus,
} from "@/lib/engines/order";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum([
    "pending",
    "in_production",
    "packed",
    "shipped",
    "delivered",
    "returned",
  ]),
});

// PATCH - update an individual recipient's delivery status (super_admin only).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; recipientId: string }> },
) {
  try {
    await requireApiRole(["super_admin"]);
    const { recipientId } = await params;
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid or missing request body." },
        { status: 400 },
      );
    }
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    await updateRecipientStatus(
      recipientId,
      parsed.data.status as RecipientDeliveryStatus,
    );
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[orders/[id]/recipients/[recipientId]]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not update the recipient. Please try again." },
      { status: 500 },
    );
  }
}

// DELETE - remove a recipient (super_admin only).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; recipientId: string }> },
) {
  try {
    await requireApiRole(["super_admin"]);
    const { recipientId } = await params;
    await removeRecipient(recipientId);
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[orders/[id]/recipients/[recipientId]]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not remove the recipient. Please try again." },
      { status: 500 },
    );
  }
}
