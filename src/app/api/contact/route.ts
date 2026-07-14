import { NextResponse, type NextRequest } from "next/server";
import { contactSchema } from "@/lib/utils/validators";
import { captureLead } from "@/lib/engines/lead";
import { sendNewLeadAlertEmail } from "@/lib/services/email";

export const runtime = "nodejs";

/**
 * PUBLIC endpoint — contact form. Persists the enquiry as a lead AND alerts
 * staff so a human sees it within seconds. Prompt 0.5 (stop the bleeding):
 *   - never returns a false success when the DB write fails,
 *   - if the DB write fails we still email staff so the enquiry reaches a human,
 *   - only if BOTH fail do we 500 with a WhatsApp/email fallback,
 *   - the staff alert can never fail the lead capture.
 * No cosmetic X-RateLimit-* headers (we don't enforce a limit here).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "validation_error",
          message: parsed.error.issues[0]?.message ?? "Invalid input",
        },
        { status: 400 },
      );
    }

    const { name, email, company, message } = parsed.data;
    const companyName = company || "Website enquiry";

    // 1. Persist the lead.
    let captured = false;
    try {
      await captureLead({
        name,
        email,
        company: companyName,
        source: "website",
        kitSummary: message ? `Message: ${message}` : undefined,
      });
      captured = true;
    } catch (err) {
      console.error("[CONTACT_CAPTURE_FAILED] lead write failed:", err);
    }

    const alertPayload = {
      name,
      company: companyName,
      email,
      message,
      sourcePage: "Contact form",
    };

    // 2a. Happy path: alert is fire-and-forget and can never fail the capture.
    if (captured) {
      void sendNewLeadAlertEmail(alertPayload).catch((err) =>
        console.error("[CONTACT_ALERT_FAILED]", err),
      );
      return NextResponse.json({ data: { received: true } });
    }

    // 2b. DB write failed → the staff alert IS the fallback to reach a human.
    let alerted = false;
    try {
      const r = await sendNewLeadAlertEmail(alertPayload);
      alerted = r.success;
    } catch (err) {
      console.error("[CONTACT_ALERT_FAILED]", err);
    }
    if (alerted) {
      return NextResponse.json({ data: { received: true } });
    }

    // 3. Both failed — do NOT lose the lead silently.
    console.error(
      "[CONTACT_CAPTURE_FAILED] both DB write and staff alert failed",
      { name, email, company: companyName },
    );
    return NextResponse.json(
      {
        error: "capture_failed",
        message:
          "Sorry — something went wrong saving your enquiry. Please reach us directly on WhatsApp at https://wa.me/919019409590 or email contact.neonvisuals@gmail.com and we'll respond right away.",
      },
      { status: 500 },
    );
  } catch (err) {
    console.error("[API_CONTACT]", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
