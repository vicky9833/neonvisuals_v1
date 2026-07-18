import { NextResponse } from "next/server";
import {
  requireApiAuth,
  auditCrossTenantAccess,
  tenantCapability,
  apiAuthErrorResponse,
} from "@/lib/api-auth";
import { getInvoice } from "@/lib/engines/billing";
import { generateInvoicePDF } from "@/lib/engines/invoice-pdf";

export const runtime = "nodejs";

// GET - generate + stream the invoice PDF. Admin: any. Client: own company.
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
    if (profile.isPlatformStaff) {
      await auditCrossTenantAccess(profile, "platform.billing.manage", {
        entity: "invoice",
        entityId: id,
        action: "invoice.pdf",
        companyId: invoice.company_id,
      });
    } else if (invoice.company_id !== profile.company_id) {
      return NextResponse.json(
        { error: "forbidden", message: "No access to this invoice." },
        { status: 403 },
      );
    } else if (
      invoice.subscription_id &&
      tenantCapability(profile, "billing.manage").effect !== "allow"
    ) {
      // Ruling C (§8b): a subscription/billing invoice needs billing.manage (owner/admin/finance).
      // Order invoices keep their existing own-company access (handled by the check above).
      return NextResponse.json(
        { error: "forbidden", message: "Billing access required for this invoice." },
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
    console.error("[invoices/[id]/pdf]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to generate invoice PDF." },
      { status: 500 },
    );
  }
}
