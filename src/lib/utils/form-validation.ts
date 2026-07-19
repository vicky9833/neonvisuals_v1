/**
 * Shared client-side validators for PUBLIC forms (gift-builder enquiry, contact/get-quote).
 * These GATE the enquiry CTAs; the server (Zod at the API boundary) remains authoritative.
 */

/**
 * Valid Indian mobile: exactly 10 digits starting 6-9, after stripping spaces/hyphens
 * and an optional `+91` / `91` country prefix. Rejects incomplete inputs like "724022".
 */
export function isValidIndianMobile(value: string): boolean {
  const digits = value.replace(/[\s-]/g, "").replace(/^\+?91/, "");
  return /^[6-9]\d{9}$/.test(digits);
}

/** Pragmatic email shape check for the client gate. */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
