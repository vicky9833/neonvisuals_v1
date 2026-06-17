import { NextResponse } from "next/server";
import { getQuote, updateQuote, updateQuoteStatus } from "@/lib/engines/quote";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    await requireApiRole(["super_admin"]);
    const { id } = await params;
    const quote = await getQuote(id);
    if (!quote) return NextResponse.json({ error: "not_found", message: "Quote not found" }, { status: 404 });
    return NextResponse.json({ data: quote });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "get_failed", message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    await requireApiRole(["super_admin"]);
    const { id } = await params;
    const updates = await request.json();
    const quote = await updateQuote(id, updates);
    return NextResponse.json({ data: quote });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "update_failed", message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    await requireApiRole(["super_admin"]);
    const { id } = await params;
    await updateQuoteStatus(id, "cancelled");
    return NextResponse.json({ data: { id, status: "cancelled" } });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "delete_failed", message }, { status: 500 });
  }
}
