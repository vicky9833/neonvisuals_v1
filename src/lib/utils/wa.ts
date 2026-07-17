/**
 * wa.me click-to-chat deep links (Decision 4: free wa.me, NO WhatsApp Business API).
 *
 * OPS notification link (Prompt 6a — ASSUMPTION, flagged for confirmation): the
 * link is for a platform OPS person to tap in the Ops Console and open THEIR
 * WhatsApp to chat the CLIENT — so the TARGET is the client's contact number,
 * prefilled with org context. If the client has no phone, the link is omitted
 * (returns null) — callers must render gracefully without it.
 *
 * PII SAFETY (§10): the prefilled text carries ORG/business-contact context only
 * (org name, plan, contact name, occasion TYPE) — NEVER an employee's
 * name/dob/phone/address.
 */

/** Normalise an Indian contact number to wa.me digits (adds 91 CC when missing). */
export function toWaDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.length === 10) return `91${digits}`;
  return digits; // already has a country code
}

export interface OpsWaContext {
  clientPhone: string | null | undefined; // client's business contact number (target)
  orgName: string;
  plan?: string | null;
  contactName?: string | null;
  /** Occasion TYPE label only (e.g. "birthday") — never an employee name. */
  occasionType?: string | null;
}

/**
 * Build an ops → client wa.me link prefilled with org context, or null when the
 * client has no usable phone. Text contains org/business-contact context only.
 */
export function buildOpsWaLink(ctx: OpsWaContext): string | null {
  const target = toWaDigits(ctx.clientPhone);
  if (!target) return null;
  const hi = ctx.contactName ? `Hi ${ctx.contactName}` : "Hi";
  const planBit = ctx.plan ? ` (${ctx.plan} plan)` : "";
  const occBit = ctx.occasionType
    ? ` about an upcoming ${ctx.occasionType} gifting moment`
    : "";
  const text = `${hi}, this is Neon Visuals reaching out to ${ctx.orgName}${planBit}${occBit}. When's a good time for a quick chat?`;
  return `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
}
