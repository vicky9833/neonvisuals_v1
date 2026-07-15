import { NextResponse } from "next/server";
import { getQuote, updateQuote, updateQuoteStatus } from "@/lib/engines/quote";
import { requirePlatform, apiAuthErrorResponse } from "@/lib/api-auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await requirePlatform("platform.billing.manage", { entity: "quote", entityId: id, action: "quote.read" });
    const quote = await getQuote(id);
    if (!quote) return NextResponse.json({ error: "not_found", message: "Quote not found" }, { status: 404 });
    return NextResponse.json({ data: quote });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[quotes/[id]]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not load the quote. Please try again." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await requirePlatform("platform.billing.manage", { entity: "quote", entityId: id, action: "quote.update" });
    const updates = await request.json().catch(() => null);
    if (updates === null) {
      return NextResponse.json({ error: "invalid_input", message: "Invalid or missing request body." }, { status: 400 });
    }
    const quote = await updateQuote(id, updates);
    return NextResponse.json({ data: quote });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[quotes/[id]]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not save the quote. Please try again." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await requirePlatform("platform.billing.manage", { entity: "quote", entityId: id, action: "quote.cancel" });
    await updateQuoteStatus(id, "cancelled");
    return NextResponse.json({ data: { id, status: "cancelled" } });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[quotes/[id]]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not cancel the quote. Please try again." },
      { status: 500 },
    );
  }
}
