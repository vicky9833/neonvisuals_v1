import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, apiAuthErrorResponse } from "@/lib/api-auth";
import {
  isEmailConfigured,
  sendWelcomeEmail,
  sendQuoteEmail,
  sendOrderConfirmationEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendInvoiceEmail,
  sendPaymentConfirmationEmail,
  sendOccasionReminderEmail,
  sendLeadFollowUpEmail,
  type EmailResult,
} from "@/lib/services/email";

export const runtime = "nodejs";

const schema = z.object({
  template: z.enum([
    "welcome",
    "quote_sent",
    "order_confirmed",
    "order_shipped",
    "order_delivered",
    "invoice_sent",
    "payment_received",
    "occasion_reminder",
    "lead_followup",
  ]),
});

export async function POST(request: Request) {
  try {
    const profile = await requireApiRole(["super_admin"]);
    const to = profile.email;
    const name = profile.full_name?.split(/\s+/)[0] ?? "there";
    const body = await request.json().catch(() => null);
    if (body === null) {
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid JSON body." },
        { status: 400 },
      );
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          error: "email_not_configured",
          message:
            "RESEND_API_KEY is not set. Add it to .env.local to send real emails.",
        },
        { status: 422 },
      );
    }

    let result: EmailResult;
    switch (parsed.data.template) {
      case "welcome":
        result = await sendWelcomeEmail({ to, name, companyName: "Acme Corp" });
        break;
      case "quote_sent":
        result = await sendQuoteEmail({
          to,
          clientName: name,
          quoteNumber: "NV-Q-2026-0001",
          occasion: "Diwali",
          kitCount: 50,
          itemCount: 3,
          validUntil: "2026-12-31",
        });
        break;
      case "order_confirmed":
        result = await sendOrderConfirmationEmail({
          to,
          clientName: name,
          orderNumber: "NV-O-2026-0001",
          occasion: "Onboarding",
          kitCount: 25,
          products: [
            { name: "Engraved Copper Bottle", sku: "NV-A01" },
            { name: "Welcome Hoodie", sku: "NV-A09" },
          ],
          expectedDelivery: "2026-07-01",
        });
        break;
      case "order_shipped":
        result = await sendOrderShippedEmail({
          to,
          clientName: name,
          orderNumber: "NV-O-2026-0001",
          trackingNumber: "BLR123456789",
          courierPartner: "Delhivery",
          expectedDelivery: "2026-07-01",
        });
        break;
      case "order_delivered":
        result = await sendOrderDeliveredEmail({
          to,
          clientName: name,
          orderNumber: "NV-O-2026-0001",
          kitCount: 25,
        });
        break;
      case "invoice_sent":
        result = await sendInvoiceEmail({
          to,
          clientName: name,
          invoiceNumber: "NV-INV-2026-0001",
          invoiceType: "advance",
          amount: 71478,
          dueDate: "2026-07-15",
          paymentLinkUrl: "https://rzp.io/i/example",
        });
        break;
      case "payment_received":
        result = await sendPaymentConfirmationEmail({
          to,
          clientName: name,
          invoiceNumber: "NV-INV-2026-0001",
          amount: 71478,
          paymentMethod: "razorpay",
          remainingBalance: 71479,
        });
        break;
      case "occasion_reminder":
        result = await sendOccasionReminderEmail({
          to,
          clientName: name,
          occasions: [
            { title: "Priya's Birthday", date: "2026-06-25", type: "birthday" },
            { title: "Diwali 2026", date: "2026-10-29", type: "festival" },
          ],
        });
        break;
      case "lead_followup":
        result = await sendLeadFollowUpEmail({
          to,
          leads: [
            {
              companyName: "TechStartup",
              contactName: "Rahul",
              followUpDate: "2026-06-19",
              notes: "Sent Diwali catalog, awaiting response.",
            },
          ],
        });
        break;
      default:
        result = { success: false, error: "Unknown template" };
    }

    return NextResponse.json({ data: result });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[admin/emails/test]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to send test email." },
      { status: 500 },
    );
  }
}
