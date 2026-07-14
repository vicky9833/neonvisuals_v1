import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import * as T from "@/lib/services/email-templates";

/**
 * Transactional email service (Resend). ALL email logic lives here.
 * Graceful degradation: when RESEND_API_KEY is empty, sends are no-ops with a
 * console warning. Every send is logged to the email_log table.
 */

const FROM = "Neon Visuals <hello@neonvisuals.in>";
const FROM_FALLBACK_EMAIL = "hello@neonvisuals.in";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export function isEmailConfigured(): boolean {
  return Boolean(resend);
}

/**
 * Internal ops/sales alert recipients. Reads OPS_ALERT_EMAIL (comma-separated),
 * falling back to the FROM address so an alert is never sent to nobody.
 */
export function opsAlertRecipients(): string[] {
  const raw = process.env.OPS_ALERT_EMAIL ?? "";
  const list = raw
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
  return list.length > 0 ? list : [FROM_FALLBACK_EMAIL];
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

interface SendParams {
  to: string | string[];
  subject: string;
  html: string;
  template: string;
  replyTo?: string;
  cc?: string[];
  attachments?: Array<{ filename: string; content: Buffer }>;
  metadata?: Record<string, unknown>;
}

async function logEmail(
  params: SendParams,
  result: { status: string; resendId?: string; error?: string },
): Promise<void> {
  try {
    const supa = createAdminClient();
    await supa.from("email_log").insert({
      to_email: Array.isArray(params.to) ? params.to.join(", ") : params.to,
      subject: params.subject,
      template: params.template,
      resend_id: result.resendId ?? null,
      status: result.status,
      error: result.error ?? null,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    console.error("[Email] Failed to write email_log:", err);
  }
}

async function sendEmail(params: SendParams): Promise<EmailResult> {
  if (!resend) {
    console.warn("[Email] Resend not configured - skipping:", params.subject);
    await logEmail(params, { status: "failed", error: "Email not configured" });
    return { success: false, error: "Email not configured" };
  }
  try {
    const result = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
      cc: params.cc,
      attachments: params.attachments,
    });
    // Resend returns { data, error } and does NOT throw on API errors. Treating
    // a non-throw as success logs a phantom "sent" with a null id even when the
    // send was rejected (e.g. unverified domain). Inspect result.error.
    if (result.error) {
      const message =
        (result.error as { message?: string }).message ?? JSON.stringify(result.error);
      console.error("[Email] Resend rejected send:", result.error);
      await logEmail(params, { status: "failed", error: message });
      return { success: false, error: message };
    }
    const id = result.data?.id;
    if (!id) {
      await logEmail(params, { status: "failed", error: "Resend returned no id" });
      return { success: false, error: "Resend returned no id" };
    }
    await logEmail(params, { status: "sent", resendId: id });
    return { success: true, id };
  } catch (error) {
    console.error("[Email] Send failed:", error);
    await logEmail(params, { status: "failed", error: String(error) });
    return { success: false, error: String(error) };
  }
}

/**
 * Throttle helper - returns true if an email of `template` was already sent to
 * `to` within the last `hours`. Used to prevent reminder/follow-up spam.
 */
export async function wasEmailSentRecently(
  to: string,
  template: string,
  hours: number,
): Promise<boolean> {
  try {
    const supa = createAdminClient();
    const since = new Date(Date.now() - hours * 3_600_000).toISOString();
    const { data } = await supa
      .from("email_log")
      .select("id")
      .eq("to_email", to)
      .eq("template", template)
      .eq("status", "sent")
      .gte("created_at", since)
      .limit(1);
    return (data ?? []).length > 0;
  } catch {
    return false;
  }
}

function rs(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

// ---------------------------------------------------------------------------
// 1. Welcome
// ---------------------------------------------------------------------------
export function sendWelcomeEmail(params: {
  to: string;
  name: string;
  companyName: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.to,
    subject: `Welcome to Neon Visuals, ${params.name}! 🎁`,
    html: T.welcomeTemplate({ name: params.name, companyName: params.companyName }),
    template: "welcome",
    metadata: { companyName: params.companyName },
  });
}

// ---------------------------------------------------------------------------
// 2. Quote sent
// ---------------------------------------------------------------------------
export function sendQuoteEmail(params: {
  to: string;
  clientName: string;
  quoteNumber: string;
  occasion: string;
  kitCount: number;
  itemCount: number;
  validUntil: string;
  pdfBuffer?: Buffer;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.to,
    subject: `Your Gifting Quote ${params.quoteNumber} - Neon Visuals`,
    html: T.quoteTemplate(params),
    template: "quote_sent",
    attachments: params.pdfBuffer
      ? [{ filename: `${params.quoteNumber}.pdf`, content: params.pdfBuffer }]
      : undefined,
    metadata: { quoteNumber: params.quoteNumber },
  });
}

// ---------------------------------------------------------------------------
// 3. Order confirmed
// ---------------------------------------------------------------------------
export function sendOrderConfirmationEmail(params: {
  to: string;
  clientName: string;
  orderNumber: string;
  occasion: string;
  kitCount: number;
  products: Array<{ name: string; sku: string }>;
  expectedDelivery?: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.to,
    subject: `Order Confirmed - ${params.orderNumber} 📦`,
    html: T.orderConfirmedTemplate(params),
    template: "order_confirmed",
    metadata: { orderNumber: params.orderNumber },
  });
}

// ---------------------------------------------------------------------------
// 4. Order shipped
// ---------------------------------------------------------------------------
export function sendOrderShippedEmail(params: {
  to: string;
  clientName: string;
  orderNumber: string;
  trackingNumber?: string;
  courierPartner?: string;
  expectedDelivery?: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.to,
    subject: `Your Order ${params.orderNumber} Has Been Shipped! 🚚`,
    html: T.orderShippedTemplate(params),
    template: "order_shipped",
    metadata: { orderNumber: params.orderNumber },
  });
}

// ---------------------------------------------------------------------------
// 5. Order delivered
// ---------------------------------------------------------------------------
export function sendOrderDeliveredEmail(params: {
  to: string;
  clientName: string;
  orderNumber: string;
  kitCount: number;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.to,
    subject: `Your Gifts Have Been Delivered! 🎉`,
    html: T.orderDeliveredTemplate(params),
    template: "order_delivered",
    metadata: { orderNumber: params.orderNumber },
  });
}

// ---------------------------------------------------------------------------
// 6. Invoice
// ---------------------------------------------------------------------------
export function sendInvoiceEmail(params: {
  to: string;
  clientName: string;
  invoiceNumber: string;
  invoiceType: string;
  amount: number;
  dueDate: string;
  paymentLinkUrl?: string;
  pdfBuffer?: Buffer;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.to,
    subject: `Invoice ${params.invoiceNumber} - ${rs(params.amount)}`,
    html: T.invoiceTemplate(params),
    template: "invoice_sent",
    attachments: params.pdfBuffer
      ? [{ filename: `${params.invoiceNumber}.pdf`, content: params.pdfBuffer }]
      : undefined,
    metadata: { invoiceNumber: params.invoiceNumber },
  });
}

// ---------------------------------------------------------------------------
// 7. Payment confirmation
// ---------------------------------------------------------------------------
export function sendPaymentConfirmationEmail(params: {
  to: string;
  clientName: string;
  invoiceNumber: string;
  amount: number;
  paymentMethod: string;
  remainingBalance: number;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.to,
    subject: `Payment Received - ${rs(params.amount)} for ${params.invoiceNumber} ✅`,
    html: T.paymentConfirmationTemplate(params),
    template: "payment_received",
    metadata: { invoiceNumber: params.invoiceNumber },
  });
}

// ---------------------------------------------------------------------------
// 8. Occasion reminder
// ---------------------------------------------------------------------------
export function sendOccasionReminderEmail(params: {
  to: string;
  clientName: string;
  occasions: Array<{ title: string; date: string; type: string; employeeName?: string }>;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.to,
    subject: `Upcoming Gifting Moments - ${params.occasions.length} this week`,
    html: T.occasionReminderTemplate(params),
    template: "occasion_reminder",
    metadata: { count: params.occasions.length },
  });
}

// ---------------------------------------------------------------------------
// 9. Lead follow-up (internal)
// ---------------------------------------------------------------------------
export function sendLeadFollowUpEmail(params: {
  to: string;
  leads: Array<{ companyName: string; contactName: string; followUpDate: string; notes: string }>;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.to,
    subject: `You have ${params.leads.length} follow-up${params.leads.length === 1 ? "" : "s"} due today`,
    html: T.leadFollowUpTemplate({ leads: params.leads }),
    template: "lead_followup",
    metadata: { count: params.leads.length },
  });
}

// ---------------------------------------------------------------------------
// 10. New lead alert (internal) — Prompt 0.5
// ---------------------------------------------------------------------------
export function sendNewLeadAlertEmail(params: {
  name: string;
  company: string;
  email?: string;
  phone?: string;
  message?: string;
  employeeCount?: string;
  occasion?: string;
  sourcePage: string;
}): Promise<EmailResult> {
  const timestampIST = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  // Click-to-chat link (only when we have a phone number).
  let whatsappUrl: string | undefined;
  if (params.phone) {
    const digits = params.phone.replace(/\D/g, "");
    const withCc = digits.length > 10 && digits.startsWith("91") ? digits : `91${digits}`;
    if (digits.length >= 10) {
      const greeting = `Hi ${params.name}, thanks for reaching out to Neon Visuals about corporate gifting for ${params.company}. When's a good time for a quick call?`;
      whatsappUrl = `https://wa.me/${withCc}?text=${encodeURIComponent(greeting)}`;
    }
  }

  return sendEmail({
    to: opsAlertRecipients(),
    subject: `New enquiry: ${params.name} - ${params.company}`,
    html: T.newLeadAlertTemplate({ ...params, whatsappUrl, timestampIST }),
    template: "new_lead_alert",
    replyTo: params.email,
    metadata: { company: params.company, source: params.sourcePage },
  });
}

// ---------------------------------------------------------------------------
// 11. Ops daily digest — upcoming occasions across ALL companies — Prompt 0.5
// ---------------------------------------------------------------------------
export function sendOpsDailyDigestEmail(params: {
  rangeDays: number;
  companies: Array<{
    companyName: string;
    events: Array<{ title: string; date: string; type: string }>;
  }>;
}): Promise<EmailResult> {
  const total = params.companies.reduce((n, c) => n + c.events.length, 0);
  return sendEmail({
    to: opsAlertRecipients(),
    subject: `Daily digest: ${total} upcoming gifting moment${total === 1 ? "" : "s"} (next ${params.rangeDays} days)`,
    html: T.opsDailyDigestTemplate(params),
    template: "ops_daily_digest",
    metadata: { total, companies: params.companies.length },
  });
}
