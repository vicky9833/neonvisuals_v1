import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiAuth,
  requireApiRole,
  apiAuthErrorResponse,
} from "@/lib/api-auth";
import { getOrder, updateOrder, toClientOrder } from "@/lib/engines/order";

export const runtime = "nodejs";

const updateSchema = z.object({
  occasionType: z.string().nullable().optional(),
  occasionLabel: z.string().nullable().optional(),
  expectedDeliveryDate: z.string().nullable().optional(),
  actualDeliveryDate: z.string().nullable().optional(),
  deliveryAddress: z.string().nullable().optional(),
  deliveryCity: z.string().nullable().optional(),
  deliveryPincode: z.string().nullable().optional(),
  trackingNumber: z.string().nullable().optional(),
  courierPartner: z.string().nullable().optional(),
  internalNotes: z.string().nullable().optional(),
  clientNotes: z.string().nullable().optional(),
  specialInstructions: z.string().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  paymentStatus: z
    .enum([
      "pending",
      "advance_received",
      "partially_paid",
      "fully_paid",
      "refunded",
    ])
    .optional(),
  advanceAmount: z.number().nullable().optional(),
  advanceDate: z.string().nullable().optional(),
  balanceAmount: z.number().nullable().optional(),
  balanceDate: z.string().nullable().optional(),
});

// GET — order detail. Admin: full. Client: own company only, no pricing.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireApiAuth();
    const { id } = await params;
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json(
        { error: "not_found", message: "Order not found" },
        { status: 404 },
      );
    }

    if (profile.role === "super_admin") {
      return NextResponse.json({ data: order });
    }
    // Client: enforce company scoping + strip pricing.
    if (order.company_id !== profile.company_id) {
      return NextResponse.json(
        { error: "forbidden", message: "You do not have access to this order." },
        { status: 403 },
      );
    }
    return NextResponse.json({ data: toClientOrder(order) });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "get_failed", message }, { status: 500 });
  }
}

// PATCH — update order (super_admin only).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiRole(["super_admin"]);
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    const order = await updateOrder(id, parsed.data);
    return NextResponse.json({ data: order });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "update_failed", message }, { status: 500 });
  }
}
