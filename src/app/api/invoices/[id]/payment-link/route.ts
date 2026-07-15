import { NextResponse } from "next/server";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import { createInvoicePaymentLink, getInvoice } from "@/lib/engines/billing";
import { generateInvoicePDF } from "@/lib/engines/invoice-pdf";
import { sendInvoiceEmail } from "@/lib/services/email";
import { isRazorpayConfigured } from "@/lib/services/razorpay";

export const runtime = "nodejs";

// POST - create a Razorpay payment link for this invoice (super_admin only).
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiRole(["super_admin"]);
    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        {
          error: "razorpay_not_configured",
          message:
            "Razorpay keys are not set. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable payment links.",
        },
        { status: 422 },
      );
    }
    const { id } = await params;
    const result = await createInvoicePaymentLink(id);

    // Awaited (serverless-safe) branded invoice email with PDF + payment link.
    // Wrapped so a send failure can't fail the payment-link creation.
    await (async () => {
      const invoice = await getInvoice(id);
      if (!invoice || !invoice.buyer_email) return;
      let pdfBuffer: Buffer | undefined;
      try {
        pdfBuffer = await generateInvoicePDF(invoice);
      } catch {
        pdfBuffer = undefined;
      }
      await sendInvoiceEmail({
        to: invoice.buyer_email,
        clientName: invoice.buyer_name,
        invoiceNumber: invoice.invoice_number ?? "",
        invoiceType: invoice.invoice_type,
        amount: invoice.amount_due,
        dueDate: invoice.due_date,
        paymentLinkUrl: result.url,
        pdfBuffer,
      });
    })().catch((err) => console.error("[Email] Invoice email failed:", err));

    return NextResponse.json({ data: result });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[invoices/[id]/payment-link]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to create payment link." },
      { status: 500 },
    );
  }
}
