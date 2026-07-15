import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import {
  getOrder,
  getOrderEmailContext,
  updateOrderStatus,
  type OrderStatus,
} from "@/lib/engines/order";
import {
  sendOrderConfirmationEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
} from "@/lib/services/email";

export const runtime = "nodejs";

const schema = z.object({
  status: z.enum([
    "draft",
    "confirmed",
    "in_production",
    "quality_check",
    "packed",
    "shipped",
    "delivered",
    "completed",
    "cancelled",
  ]),
  notes: z.string().optional(),
});

// PATCH - advance order status (super_admin only). Validates the transition,
// logs history, and auto-generates gift records on "delivered".
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireApiRole(["super_admin"]);
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid or missing request body." },
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
    await updateOrderStatus(
      id,
      parsed.data.status as OrderStatus,
      parsed.data.notes,
      profile.id,
    );

    // Fire-and-forget branded status email (confirmed / shipped / delivered).
    const status = parsed.data.status;
    if (["confirmed", "shipped", "delivered"].includes(status)) {
      // Awaited (serverless-safe): Vercel freezes the function after the
      // response, so fire-and-forget sends never run. Wrapped so a send
      // failure can't fail the status update.
      await (async () => {
        const ctx = await getOrderEmailContext(id);
        if (!ctx) return;
        if (status === "confirmed") {
          await sendOrderConfirmationEmail({
            to: ctx.to,
            clientName: ctx.clientName,
            orderNumber: ctx.orderNumber,
            occasion: ctx.occasion,
            kitCount: ctx.kitCount,
            products: ctx.products,
            expectedDelivery: ctx.expectedDelivery,
          });
        } else if (status === "shipped") {
          await sendOrderShippedEmail({
            to: ctx.to,
            clientName: ctx.clientName,
            orderNumber: ctx.orderNumber,
            trackingNumber: ctx.trackingNumber,
            courierPartner: ctx.courierPartner,
            expectedDelivery: ctx.expectedDelivery,
          });
        } else {
          await sendOrderDeliveredEmail({
            to: ctx.to,
            clientName: ctx.clientName,
            orderNumber: ctx.orderNumber,
            kitCount: ctx.kitCount,
          });
        }
      })().catch((err) => console.error("[Email] Order status failed:", err));
    }

    const order = await getOrder(id);
    return NextResponse.json({ data: order });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    // Invalid transitions / missing cancel reason are client errors.
    const isClientError =
      message.startsWith("Invalid status transition") ||
      message.includes("reason is required");
    if (isClientError) {
      return NextResponse.json(
        { error: "invalid_transition", message },
        { status: 400 },
      );
    }
    console.error("[orders/[id]/status]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not update the order status. Please try again." },
      { status: 500 },
    );
  }
}
