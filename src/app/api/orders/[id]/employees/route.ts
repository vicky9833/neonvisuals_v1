import { NextResponse } from "next/server";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import { getOrder, listCompanyEmployees } from "@/lib/engines/order";

export const runtime = "nodejs";

// GET — active employees of an order's company, for recipient selection
// (super_admin only).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiRole(["super_admin"]);
    const { id } = await params;
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "list_failed", message }, { status: 500 });
  }
}
