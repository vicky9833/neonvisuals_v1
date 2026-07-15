import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiAuth,
  requirePlatform,
  auditCrossTenantAccess,
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

// GET - order detail. Admin: full. Client: own company only, no pricing.
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

    if (profile.isPlatformStaff) {
      await auditCrossTenantAccess(profile, "platform.orders.manage", {
        entity: "order",
        entityId: id,
        action: "order.read",
        companyId: order.company_id,
      });
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
    console.error("[orders/[id]]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not load the order. Please try again." },
      { status: 500 },
    );
  }
}

// PATCH - update order (super_admin only).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requirePlatform("platform.orders.manage", { entity: "order", entityId: id, action: "order.update" });
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid or missing request body." },
        { status: 400 },
      );
    }
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
    console.error("[orders/[id]]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not update the order. Please try again." },
      { status: 500 },
    );
  }
}
