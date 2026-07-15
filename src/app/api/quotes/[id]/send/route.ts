import { NextResponse } from "next/server";
import { getQuote, updateQuoteStatus } from "@/lib/engines/quote";
import { generateQuotePDF } from "@/lib/engines/pdf";
import { sendQuoteEmail } from "@/lib/services/email";
import { WHATSAPP_NUMBER, SUPPORT_EMAIL } from "@/lib/utils/constants";
import { requirePlatform, apiAuthErrorResponse } from "@/lib/api-auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await requirePlatform("platform.billing.manage", { entity: "quote", entityId: id, action: "quote.send" });
    const quote = await getQuote(id);
    if (!quote) return NextResponse.json({ error: "not_found", message: "Quote not found" }, { status: 404 });

    await updateQuoteStatus(id, "sent");

    // Fire-and-forget branded email with the quote PDF attached.
    if (quote.client_email) {
      (async () => {
        let pdfBuffer: Buffer | undefined;
        try {
          pdfBuffer = await generateQuotePDF(quote);
        } catch {
          pdfBuffer = undefined;
        }
        await sendQuoteEmail({
          to: quote.client_email,
          clientName: quote.client_name,
          quoteNumber: quote.quote_number,
          occasion: quote.occasion,
          kitCount: quote.kit_count,
          itemCount: quote.products.length,
          validUntil: quote.valid_until ?? `${quote.validity_days} days`,
          pdfBuffer,
        });
      })().catch((err) => console.error("[Email] Quote send failed:", err));
    }

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
    console.error("[quotes/[id]/send]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not send the quote. Please try again." },
      { status: 500 },
    );
  }
}
