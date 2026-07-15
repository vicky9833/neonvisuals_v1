import { NextResponse } from "next/server";
import { requirePlatform, apiAuthErrorResponse } from "@/lib/api-auth";
import { getOrder, listCompanyEmployees } from "@/lib/engines/order";

export const runtime = "nodejs";

// GET - active employees of an order's company, for recipient selection
// (super_admin only).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requirePlatform("platform.orders.manage", { entity: "order", entityId: id, action: "order.employees.read" });
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json(
        { error: "not_found", message: "Order not found" },
        { status: 404 },
      );
    }
    const employees = await listCompanyEmployees(order.company_id);
    return NextResponse.json({ data: employees });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[orders/[id]/employees]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not load employees. Please try again." },
      { status: 500 },
    );
  }
}
