import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiAuth,
  requireApiRole,
  apiAuthErrorResponse,
} from "@/lib/api-auth";
import {
  addRecipients,
  getOrder,
  getOrderRecipients,
} from "@/lib/engines/order";

export const runtime = "nodejs";

const recipientSchema = z.object({
  employeeId: z.string().uuid().optional(),
  recipientName: z.string().min(1),
  recipientEmail: z.string().email().optional().or(z.literal("")),
  recipientDepartment: z.string().optional(),
  personalisationName: z.string().min(1),
  personalisationMessage: z.string().optional(),
  notes: z.string().optional(),
});

const bodySchema = z.object({
  recipients: z.array(recipientSchema).min(1),
});

// GET — list recipients for this order (admin: any; client: own company).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireApiAuth();
    const { id } = await params;

    if (profile.role !== "super_admin") {
      const order = await getOrder(id);
      if (!order || order.company_id !== profile.company_id) {
        return NextResponse.json(
          { error: "forbidden", message: "No access to this order." },
          { status: 403 },
        );
      }
    }
    const recipients = await getOrderRecipients(id);
    return NextResponse.json({ data: recipients });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "list_failed", message }, { status: 500 });
  }
}

// POST — add recipients (super_admin only).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiRole(["super_admin"]);
    const { id } = await params;
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    const recipients = parsed.data.recipients.map((r) => ({
      ...r,
      recipientEmail: r.recipientEmail === "" ? undefined : r.recipientEmail,
    }));
    await addRecipients(id, recipients);
    const all = await getOrderRecipients(id);
    return NextResponse.json({ data: all }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "add_failed", message }, { status: 500 });
  }
}
