import { NextResponse } from "next/server";
import { getQuote, updateQuoteStatus } from "@/lib/engines/quote";
import { WHATSAPP_NUMBER, SUPPORT_EMAIL } from "@/lib/utils/constants";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";

// Email send via Resend comes in Prompt 20.
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Ctx) {
  try {
    await requireApiRole(["super_admin"]);
    const { id } = await params;
    const quote = await getQuote(id);
    if (!quote) return NextResponse.json({ error: "not_found", message: "Quote not found" }, { status: 404 });

    await updateQuoteStatus(id, "sent");

    const summary = `Hi ${quote.client_name}, here is your Neon Visuals quote ${quote.quote_number} for the ${quote.occasion} experience kit (${quote.kit_count} kits). Per-kit investment: Rs. ${Math.round(quote.per_kit_investment).toLocaleString("en-IN")}. Total: Rs. ${Math.round(quote.final_total).toLocaleString("en-IN")}.`;
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(summary)}`;
    const emailUrl = `mailto:${quote.client_email}?subject=${encodeURIComponent(
      `Your Neon Visuals Quote ${quote.quote_number}`,
    )}&body=${encodeURIComponent(summary)}`;

    return NextResponse.json({
      data: { status: "sent", whatsappUrl, emailUrl, supportEmail: SUPPORT_EMAIL },
    });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "send_failed", message }, { status: 500 });
  }
}
