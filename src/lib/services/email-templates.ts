/**
 * Branded transactional email templates. Table-based HTML for cross-client
 * compatibility (Gmail, Outlook, Apple Mail). No flexbox/grid/external CSS.
 */

interface BaseTemplateParams {
  preheader: string;
  headline: string;
  body: string; // HTML
  ctaText?: string;
  ctaUrl?: string;
  footerExtra?: string;
}

export function baseTemplate(params: BaseTemplateParams): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.headline}</title>
</head>
<body style="margin:0;padding:0;background-color:#FAFAF8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${params.preheader}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF8;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <tr><td style="background:#1A1A2E;padding:24px 32px;text-align:center;">
          <h1 style="color:#C4A35A;font-size:24px;margin:0;letter-spacing:2px;">NEON VISUALS</h1>
          <p style="color:#94A3B8;font-size:12px;margin:4px 0 0;">Crafted with Intention. Remembered with Pride.</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="color:#1A1A2E;font-size:22px;margin:0 0 16px;">${params.headline}</h2>
          ${params.body}
          ${
            params.ctaText && params.ctaUrl
              ? `<div style="text-align:center;margin:32px 0;">
                  <a href="${params.ctaUrl}" style="background:#1A1A2E;color:#FFFFFF;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">${params.ctaText}</a>
                </div>`
              : ""
          }
        </td></tr>
        <tr><td style="background:#F5F0E8;padding:24px 32px;border-top:1px solid #EDE9E3;">
          ${params.footerExtra || ""}
          <p style="color:#666;font-size:12px;margin:8px 0 0;text-align:center;">
            Neon Visuals &middot; Bengaluru, Karnataka &amp; Mumbai, Maharashtra<br>
            +91 90194 09590 &middot; contact@neonvisuals.in<br>
            <a href="https://neonvisuals.in" style="color:#C4A35A;">neonvisuals.in</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://neonvisuals.in";
const WA = "https://wa.me/919019409590";

function p(text: string): string {
  return `<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 14px;">${text}</p>`;
}

function rs(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

// 1. Welcome
export function welcomeTemplate(params: { name: string; companyName: string }) {
  return baseTemplate({
    preheader: `Welcome to Neon Visuals, ${params.name}!`,
    headline: `Welcome aboard, ${params.name}! 🎁`,
    body:
      p(`We're thrilled to have <strong>${params.companyName}</strong> on Neon Visuals - the home of personalised corporate gifting that your team will actually remember.`) +
      p("Here's what you can do next:") +
      `<ul style="color:#333;font-size:15px;line-height:1.7;">
        <li>Browse 120+ products across 11 collections</li>
        <li>Curate a custom Experience Kit in the Gift Builder</li>
        <li>Add your team to unlock occasion reminders and gift history</li>
      </ul>`,
    ctaText: "Explore Your Dashboard →",
    ctaUrl: `${APP_URL}/dashboard`,
  });
}

// 2. Quote sent
export function quoteTemplate(params: {
  clientName: string;
  quoteNumber: string;
  occasion: string;
  kitCount: number;
  itemCount: number;
  validUntil: string;
}) {
  return baseTemplate({
    preheader: `Your gifting quote ${params.quoteNumber}`,
    headline: `Your Gifting Quote is Ready`,
    body:
      p(`Hi ${params.clientName}, thank you for your interest. Here's a summary of your quote <strong>${params.quoteNumber}</strong>:`) +
      `<table width="100%" cellpadding="6" style="font-size:14px;color:#333;border-collapse:collapse;">
        <tr><td style="color:#666;">Occasion</td><td align="right"><strong>${params.occasion}</strong></td></tr>
        <tr><td style="color:#666;">Products</td><td align="right">${params.itemCount}</td></tr>
        <tr><td style="color:#666;">Kits</td><td align="right">${params.kitCount}</td></tr>
        <tr><td style="color:#666;">Valid until</td><td align="right">${params.validUntil}</td></tr>
      </table>` +
      p("The detailed quote is attached as a PDF. Questions? Just reply or message us on WhatsApp."),
    ctaText: "Discuss on WhatsApp →",
    ctaUrl: WA,
  });
}

// 3. Order confirmed
export function orderConfirmedTemplate(params: {
  clientName: string;
  orderNumber: string;
  occasion: string;
  kitCount: number;
  products: Array<{ name: string; sku: string }>;
  expectedDelivery?: string;
}) {
  const list = params.products
    .map((pr) => `<li>${pr.name} <span style="color:#999;">(${pr.sku})</span></li>`)
    .join("");
  return baseTemplate({
    preheader: `Order ${params.orderNumber} confirmed`,
    headline: `Order Confirmed - ${params.orderNumber} 📦`,
    body:
      p(`Hi ${params.clientName}, your order is confirmed and moving into production.`) +
      `<table width="100%" cellpadding="6" style="font-size:14px;color:#333;">
        <tr><td style="color:#666;">Occasion</td><td align="right"><strong>${params.occasion}</strong></td></tr>
        <tr><td style="color:#666;">Kits</td><td align="right">${params.kitCount}</td></tr>
        ${params.expectedDelivery ? `<tr><td style="color:#666;">Expected delivery</td><td align="right">${params.expectedDelivery}</td></tr>` : ""}
      </table>` +
      `<p style="color:#333;font-size:15px;margin:14px 0 6px;"><strong>Products</strong></p>
       <ul style="color:#333;font-size:14px;line-height:1.7;">${list}</ul>`,
    ctaText: "Track Your Order →",
    ctaUrl: `${APP_URL}/dashboard/orders`,
  });
}

// 4. Order shipped
export function orderShippedTemplate(params: {
  clientName: string;
  orderNumber: string;
  trackingNumber?: string;
  courierPartner?: string;
  expectedDelivery?: string;
}) {
  return baseTemplate({
    preheader: `Order ${params.orderNumber} shipped`,
    headline: `Your Order Has Been Shipped! 🚚`,
    body:
      p(`Hi ${params.clientName}, great news - order <strong>${params.orderNumber}</strong> is on its way.`) +
      `<table width="100%" cellpadding="6" style="font-size:14px;color:#333;">
        ${params.courierPartner ? `<tr><td style="color:#666;">Courier</td><td align="right">${params.courierPartner}</td></tr>` : ""}
        ${params.trackingNumber ? `<tr><td style="color:#666;">Tracking</td><td align="right"><strong>${params.trackingNumber}</strong></td></tr>` : ""}
        ${params.expectedDelivery ? `<tr><td style="color:#666;">Expected delivery</td><td align="right">${params.expectedDelivery}</td></tr>` : ""}
      </table>`,
    ctaText: "Track Shipment →",
    ctaUrl: `${APP_URL}/dashboard/orders`,
  });
}

// 5. Order delivered
export function orderDeliveredTemplate(params: {
  clientName: string;
  orderNumber: string;
  kitCount: number;
}) {
  return baseTemplate({
    preheader: `Order ${params.orderNumber} delivered`,
    headline: `Your Gifts Have Been Delivered! 🎉`,
    body:
      p(`Hi ${params.clientName}, all ${params.kitCount} kits from order <strong>${params.orderNumber}</strong> have been delivered.`) +
      p("We'd love to hear how your team reacted - your feedback helps us make every future gift even better."),
    ctaText: "Share Your Team's Reaction →",
    ctaUrl: WA,
  });
}

// 6. Invoice
export function invoiceTemplate(params: {
  clientName: string;
  invoiceNumber: string;
  invoiceType: string;
  amount: number;
  dueDate: string;
  paymentLinkUrl?: string;
}) {
  return baseTemplate({
    preheader: `Invoice ${params.invoiceNumber} - ${rs(params.amount)}`,
    headline: `Invoice ${params.invoiceNumber}`,
    body:
      p(`Hi ${params.clientName}, please find your ${params.invoiceType} invoice attached.`) +
      `<table width="100%" cellpadding="6" style="font-size:14px;color:#333;">
        <tr><td style="color:#666;">Amount due</td><td align="right"><strong style="font-size:18px;color:#1A1A2E;">${rs(params.amount)}</strong></td></tr>
        <tr><td style="color:#666;">Due date</td><td align="right">${params.dueDate}</td></tr>
      </table>` +
      p(params.paymentLinkUrl ? "Pay securely online using the button below, or reply for bank/UPI details." : "Reply to this email or message us on WhatsApp for payment details."),
    ctaText: params.paymentLinkUrl ? "Pay Now →" : "Get Payment Details →",
    ctaUrl: params.paymentLinkUrl ?? WA,
  });
}

// 7. Payment confirmation
export function paymentConfirmationTemplate(params: {
  clientName: string;
  invoiceNumber: string;
  amount: number;
  paymentMethod: string;
  remainingBalance: number;
}) {
  return baseTemplate({
    preheader: `Payment received for ${params.invoiceNumber}`,
    headline: `Payment Received ✅`,
    body:
      p(`Hi ${params.clientName}, we've received your payment of <strong>${rs(params.amount)}</strong> for invoice ${params.invoiceNumber} via ${params.paymentMethod}.`) +
      (params.remainingBalance > 0
        ? p(`Remaining balance: <strong>${rs(params.remainingBalance)}</strong>.`)
        : p("This invoice is now fully paid. Thank you!")),
    ctaText: "View Your Billing →",
    ctaUrl: `${APP_URL}/dashboard/billing`,
  });
}

// 8. Occasion reminder
export function occasionReminderTemplate(params: {
  clientName: string;
  occasions: Array<{ title: string; date: string; type: string; employeeName?: string }>;
}) {
  const list = params.occasions
    .map(
      (o) =>
        `<li><strong>${o.title}</strong> - ${o.date}${o.employeeName ? ` (${o.employeeName})` : ""}</li>`,
    )
    .join("");
  return baseTemplate({
    preheader: `${params.occasions.length} upcoming gifting moments`,
    headline: `Upcoming Gifting Moments`,
    body:
      p(`Hi ${params.clientName}, here are the occasions coming up for your team:`) +
      `<ul style="color:#333;font-size:15px;line-height:1.8;">${list}</ul>` +
      p("Plan ahead so every moment lands on time."),
    ctaText: "Plan Your Gifts →",
    ctaUrl: `${APP_URL}/gift-builder`,
  });
}

// 9. Lead follow-up (internal)
export function leadFollowUpTemplate(params: {
  leads: Array<{ companyName: string; contactName: string; followUpDate: string; notes: string }>;
}) {
  const list = params.leads
    .map(
      (l) =>
        `<li><strong>${l.companyName}</strong> - ${l.contactName} (due ${l.followUpDate})${l.notes ? `<br><span style="color:#666;">${l.notes}</span>` : ""}</li>`,
    )
    .join("");
  return baseTemplate({
    preheader: `${params.leads.length} follow-ups due`,
    headline: `You have ${params.leads.length} follow-up${params.leads.length === 1 ? "" : "s"} due`,
    body:
      p("These leads need your attention today:") +
      `<ul style="color:#333;font-size:15px;line-height:1.8;">${list}</ul>`,
    ctaText: "Open Sales Pipeline →",
    ctaUrl: `${APP_URL}/ops/leads`,
  });
}

// 10. New lead alert (internal — Prompt 0.5, "stop the bleeding")
export function newLeadAlertTemplate(params: {
  name: string;
  company: string;
  email?: string;
  phone?: string;
  message?: string;
  employeeCount?: string;
  occasion?: string;
  sourcePage: string;
  whatsappUrl?: string;
  timestampIST: string;
}): string {
  const row = (label: string, value?: string) =>
    value
      ? `<tr><td style="color:#666;padding:6px 0;">${label}</td><td align="right" style="padding:6px 0;"><strong>${value}</strong></td></tr>`
      : "";
  return baseTemplate({
    preheader: `New enquiry from ${params.name} at ${params.company}`,
    headline: `New enquiry: ${params.name}`,
    body:
      p(`A new enquiry just came in. Everything you need to make the call is below — no dashboard required.`) +
      `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#333;border-collapse:collapse;">
        ${row("Name", params.name)}
        ${row("Company", params.company)}
        ${row("Work email", params.email)}
        ${row("Phone", params.phone)}
        ${row("Employees", params.employeeCount)}
        ${row("Occasion", params.occasion)}
        ${row("Source", params.sourcePage)}
        ${row("Received (IST)", params.timestampIST)}
      </table>` +
      (params.message
        ? `<p style="color:#333;font-size:15px;margin:16px 0 6px;"><strong>Message</strong></p>${p(params.message)}`
        : "") +
      (params.email
        ? p(`Reply directly: <a href="mailto:${params.email}" style="color:#C4A35A;">${params.email}</a>`)
        : ""),
    ctaText: params.whatsappUrl ? "Chat on WhatsApp →" : "Open Sales Pipeline →",
    ctaUrl: params.whatsappUrl ?? `${APP_URL}/ops/leads`,
  });
}

// 11. Ops daily digest — upcoming occasions across ALL companies (Prompt 0.5)
export function opsDailyDigestTemplate(params: {
  rangeDays: number;
  companies: Array<{
    companyName: string;
    events: Array<{ title: string; date: string; type: string }>;
  }>;
}): string {
  const total = params.companies.reduce((n, c) => n + c.events.length, 0);
  const blocks = params.companies
    .map(
      (c) =>
        `<p style="color:#1A1A2E;font-size:15px;margin:18px 0 6px;"><strong>${c.companyName}</strong></p>
         <ul style="color:#333;font-size:14px;line-height:1.8;margin:0;">
           ${c.events
             .map((e) => `<li>${e.date} — ${e.title} <span style="color:#999;">(${e.type})</span></li>`)
             .join("")}
         </ul>`,
    )
    .join("");
  return baseTemplate({
    preheader: `${total} upcoming gifting moments in the next ${params.rangeDays} days`,
    headline: `Upcoming Gifting Moments — Next ${params.rangeDays} Days`,
    body:
      p(`Proactive call list: <strong>${total}</strong> occasions across <strong>${params.companies.length}</strong> ${params.companies.length === 1 ? "company" : "companies"} in the next ${params.rangeDays} days.`) +
      (blocks || p("No upcoming occasions in the window. Enjoy the quiet.")),
    ctaText: "Open Admin →",
    ctaUrl: `${APP_URL}/ops`,
  });
}

// ---------------------------------------------------------------------------
// 12. Member invited (Prompt 3a) — the invite link
// ---------------------------------------------------------------------------
export function memberInviteTemplate(params: {
  inviterName: string;
  role: string;
  acceptUrl: string;
}): string {
  const roleLabel = params.role.replace(/^org_/, "").replace(/_/g, " ");
  return baseTemplate({
    preheader: `You've been invited to join a team on Neon Visuals as ${roleLabel}.`,
    headline: "You're invited to join a team",
    body:
      p(`<strong>${params.inviterName}</strong> has invited you to join their organisation on Neon Visuals as <strong>${roleLabel}</strong>.`) +
      p("Click below to accept. Sign in (or create an account) with this email address, then confirm — the link is single-use and expires in 7 days.") +
      p('<span style="color:#888;font-size:13px;">If you weren\'t expecting this invitation, you can safely ignore this email.</span>'),
    ctaText: "Accept invitation",
    ctaUrl: params.acceptUrl,
  });
}

// ---------------------------------------------------------------------------
// 13. Member joined (Prompt 3a) — notify owner/admins
// ---------------------------------------------------------------------------
export function memberJoinedTemplate(params: {
  companyName: string;
  memberEmail: string;
}): string {
  return baseTemplate({
    preheader: `${params.memberEmail} has joined ${params.companyName}.`,
    headline: "A new member joined your team",
    body:
      p(`<strong>${params.memberEmail}</strong> has accepted their invitation and joined <strong>${params.companyName}</strong> on Neon Visuals.`) +
      p("You can manage your team's roles and access from your dashboard."),
    ctaText: "Open dashboard",
    ctaUrl: `${APP_URL}/dashboard`,
  });
}

// ---------------------------------------------------------------------------
// 14. Member role changed (Prompt 3b) — §7 security notice
// ---------------------------------------------------------------------------
export function memberRoleChangedTemplate(params: {
  companyName: string;
  memberEmail: string;
  oldRole: string;
  newRole: string;
  changedBy: string;
}): string {
  const label = (r: string) => r.replace(/^org_/, "").replace(/_/g, " ");
  return baseTemplate({
    preheader: `Role changed to ${label(params.newRole)} in ${params.companyName}.`,
    headline: "A team role was changed",
    body:
      p(`In <strong>${params.companyName}</strong>, the role for <strong>${params.memberEmail}</strong> was changed from <strong>${label(params.oldRole)}</strong> to <strong>${label(params.newRole)}</strong> by ${params.changedBy}.`) +
      p('<span style="color:#888;font-size:13px;">You\'re receiving this security notice because you\'re the affected member or an owner of this organisation. If this wasn\'t expected, review your team settings.</span>'),
    ctaText: "Review team",
    ctaUrl: `${APP_URL}/dashboard/team`,
  });
}
