import { NextResponse } from "next/server";
import { requireApiAuth, apiAuthErrorResponse } from "@/lib/api-auth";
import { getInvoice } from "@/lib/engines/billing";
import { generateInvoicePDF } from "@/lib/engines/invoice-pdf";

export const runtime = "nodejs";

// GET — generate + stream the invoice PDF. Admin: any. Client: own company.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireApiAuth();
    const { id } = await params;
    const invoice = await getInvoice(id);
    if (!invoice) {
      return NextResponse.json(
        { error: "not_found", message: "Invoice not found" },
        { status: 404 },
      );
    }
    if (
      profile.role !== "super_admin" &&
      invoice.company_id !== profile.company_id
    ) {
      return NextResponse.json(
        { error: "forbidden", message: "No access to this invoice." },
        { status: 403 },
      );
    }

    const buffer = await generateInvoicePDF(invoice);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoice_number ?? "invoice"}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "pdf_failed", message }, { status: 500 });
  }
}
