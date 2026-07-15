import { NextResponse } from "next/server";
import { getQuote } from "@/lib/engines/quote";
import { generateQuotePDF } from "@/lib/engines/pdf";
import {
  requireApiAuth,
  auditCrossTenantAccess,
  apiAuthErrorResponse,
} from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const profile = await requireApiAuth();
    const { id } = await params;
    const quote = await getQuote(id);
    if (!quote) return NextResponse.json({ error: "not_found", message: "Quote not found" }, { status: 404 });

    // Platform staff can download any quote (cross-tenant → audited). Otherwise
    // the quote must belong to the requester (matching email, or company name).
    if (profile.isPlatformStaff) {
      await auditCrossTenantAccess(profile, "platform.billing.manage", {
        entity: "quote",
        entityId: id,
        action: "quote.pdf",
      });
    } else {
      let companyName: string | null = null;
      if (profile.company_id) {
        const supabase = await createClient();
        const { data: company } = await supabase
          .from("companies")
          .select("name")
          .eq("id", profile.company_id)
          .single();
        companyName = company?.name ?? null;
      }
      const ownsQuote =
        quote.client_email?.toLowerCase() === profile.email.toLowerCase() ||
        (companyName !== null && quote.client_company === companyName);
      if (!ownsQuote) {
        return NextResponse.json(
          { error: "forbidden", message: "You cannot access this quote." },
          { status: 403 },
        );
      }
    }

    const buffer = await generateQuotePDF(quote);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${quote.quote_number}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[quotes/[id]/pdf]", err);
    return NextResponse.json(
      { error: "server_error", message: "Could not generate the PDF. Please try again." },
      { status: 500 },
    );
  }
}
