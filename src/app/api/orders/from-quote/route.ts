import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import { convertQuoteToOrder } from "@/lib/engines/order";

export const runtime = "nodejs";

const schema = z.object({
  quoteId: z.string().uuid(),
  companyId: z.string().uuid().optional(),
});

// POST — convert an accepted quote into a draft order (super_admin only).
export async function POST(request: Request) {
  try {
    const profile = await requireApiRole(["super_admin"]);
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    const order = await convertQuoteToOrder(
      parsed.data.quoteId,
      parsed.data.companyId,
      profile.id,
    );
    return NextResponse.json({ data: order }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    const isClientError = message.includes("Could not resolve a company");
    return NextResponse.json(
      { error: isClientError ? "no_company" : "convert_failed", message },
      { status: isClientError ? 400 : 500 },
    );
  }
}
