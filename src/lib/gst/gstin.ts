/**
 * GSTIN parsing + validation, including the REAL GSTN mod-36 check-digit algorithm.
 *
 * A GSTIN is 15 characters:
 *   [1-2]  state code (2 digits)
 *   [3-12] PAN (5 letters, 4 digits, 1 letter)
 *   [13]   entity/registration number for the PAN in the state (0-9 or A-Z)
 *   [14]   default 'Z' (reserved)
 *   [15]   checksum character (mod-36)
 *
 * Checksum algorithm (GSTN, a Luhn-mod-36 variant): alphabet "0-9A-Z" (base 36),
 * iterate the first 14 chars RIGHT→LEFT with an alternating weight starting at 2
 * (2,1,2,1,…). For each: product = weight * codePoint; then reduce the product to
 * (product / 36) + (product % 36) (sum of its two base-36 digits); accumulate.
 * checkCodePoint = (36 - (sum % 36)) % 36; the checksum char is alphabet[checkCodePoint].
 *
 * Verified: 27BZSPV5411Q1ZA → check digit 'A'. Pure module — no imports beyond the
 * state-code helpers.
 */
import { isValidStateCode, type StateCode } from "./state-codes";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MOD = 36;

/**
 * Structural GSTIN regex: 2 digits · 5 letters · 4 digits · 1 letter (PAN) ·
 * 1 alphanumeric entity char · 1 alphanumeric (14th, usually 'Z') · 1 alphanumeric checksum.
 */
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][0-9A-Z][0-9A-Z]$/;

export interface ParsedGstin {
  stateCode: string;
  pan: string;
  entityNumber: string;
  checkDigit: string;
}

/** Trim + uppercase. */
export function normalizeGstin(raw: string): string {
  return (raw ?? "").trim().toUpperCase();
}

/** Structural (regex) check on the normalized value. Does NOT verify the checksum. */
export function isValidGstinFormat(raw: string): boolean {
  return GSTIN_RE.test(normalizeGstin(raw));
}

/**
 * Parse a structurally-valid GSTIN into its parts, or null.
 * PAN = characters 3–12; entityNumber = char 13; checkDigit = char 15.
 */
export function parseGstin(raw: string): ParsedGstin | null {
  const g = normalizeGstin(raw);
  if (!isValidGstinFormat(g)) return null;
  return {
    stateCode: g.slice(0, 2),
    pan: g.slice(2, 12),
    entityNumber: g.charAt(12),
    checkDigit: g.charAt(14),
  };
}

/** The GSTN mod-36 check character computed over the first 14 characters. */
function computeCheckChar(first14: string): string {
  let sum = 0;
  let factor = 2; // rightmost char uses weight 2, then alternate 1,2,1,…
  for (let i = first14.length - 1; i >= 0; i -= 1) {
    const codePoint = ALPHABET.indexOf(first14.charAt(i));
    // first14 has already passed the regex, so codePoint is always >= 0.
    let addend = factor * codePoint;
    addend = Math.floor(addend / MOD) + (addend % MOD);
    sum += addend;
    factor = factor === 2 ? 1 : 2;
  }
  const checkCodePoint = (MOD - (sum % MOD)) % MOD;
  return ALPHABET.charAt(checkCodePoint);
}

/** Full mod-36 checksum validation (format + check digit). */
export function isValidGstinChecksum(raw: string): boolean {
  const g = normalizeGstin(raw);
  if (!isValidGstinFormat(g)) return false;
  return computeCheckChar(g.slice(0, 14)) === g.charAt(14);
}

export type GstinValidation =
  | { ok: true; parsed: ParsedGstin }
  | { ok: false; reason: string };

/** Format + state-code + checksum validation, returning a typed result. */
export function validateGstin(raw: string): GstinValidation {
  const g = normalizeGstin(raw);
  if (g.length !== 15) return { ok: false, reason: "length_not_15" };
  if (!isValidGstinFormat(g)) return { ok: false, reason: "format_invalid" };
  if (!isValidStateCode(g.slice(0, 2))) return { ok: false, reason: "state_code_invalid" };
  if (!isValidGstinChecksum(g)) return { ok: false, reason: "checksum_invalid" };
  return { ok: true, parsed: parseGstin(g)! };
}

/** State code (typed) from a fully-valid GSTIN, else null. */
export function stateCodeFromGstin(raw: string): StateCode | null {
  const v = validateGstin(raw);
  if (!v.ok) return null;
  const code = v.parsed.stateCode;
  return isValidStateCode(code) ? code : null;
}

/** PAN (characters 3–12) from a structurally-valid GSTIN, else null. */
export function panFromGstin(raw: string): string | null {
  const parsed = parseGstin(raw);
  return parsed ? parsed.pan : null;
}
