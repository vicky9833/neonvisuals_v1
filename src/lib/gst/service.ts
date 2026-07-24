/**
 * GST computation service. ALL MONEY IS INTEGER PAISE. No floats, no rupees, no city strings.
 *
 * Supply type is decided SOLELY by comparing the seller state code to the place-of-supply state
 * code (equal → INTRA_STATE, else INTER_STATE). Place of supply follows the legal precedence in
 * resolvePlaceOfSupply — and for a bill-to/ship-to supply it is the BUYER's location, never the
 * delivery address.
 */
import { isValidStateCode, type StateCode } from "./state-codes";
import { stateCodeFromGstin } from "./gstin";
import { sellerStateCodeFor } from "./registrations";
import {
  ALLOWED_GST_RATES,
  GstValidationError,
  type GstComputation,
  type GstLineInput,
  type GstLineResult,
  type HsnSummaryRow,
  type RateSummaryRow,
  type SupplyType,
} from "./types";

/** Round a NON-NEGATIVE value to the nearest integer, ties up (half-up). */
function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5);
}

/**
 * Round a grand total (integer paise) to the nearest rupee per Section 170 of the CGST Act, 2017:
 * any fraction of a rupee rounds to the nearest rupee, and a tie (exactly 50 paise) rounds UP.
 *
 * LIMITATION — NEGATIVE TOTALS ARE NOT SUPPORTED YET.
 * This uses Math.round(x / 100), which breaks ties toward +Infinity. That is the correct
 * Section-170 "ties up" behaviour ONLY while grandTotalBeforeRoundingPaise >= 0. For a NEGATIVE
 * total (which will arise once Credit Notes are introduced) Math.round rounds a -x.50 tie toward
 * zero, i.e. the WRONG direction for a symmetric away-from-zero / ties-up rule. Credit Note support
 * MUST revisit this and choose an explicit signed rounding policy. Until then we FAIL LOUD (throw)
 * rather than emit a silently mis-rounded negative total.
 *
 * @returns grandTotalPaise (a multiple of 100) and the signed roundOffPaise ∈ [-49, +50].
 */
export function roundGrandTotalToRupee(grandTotalBeforeRoundingPaise: number): {
  grandTotalPaise: number;
  roundOffPaise: number;
} {
  if (!Number.isFinite(grandTotalBeforeRoundingPaise) || !Number.isInteger(grandTotalBeforeRoundingPaise)) {
    throw new GstValidationError(
      "invalid_grand_total",
      `Grand total must be an integer paise value (got ${grandTotalBeforeRoundingPaise}).`,
    );
  }
  if (grandTotalBeforeRoundingPaise < 0) {
    throw new GstValidationError(
      "negative_grand_total",
      `Grand total is negative (${grandTotalBeforeRoundingPaise} paise). Negative totals (e.g. Credit ` +
        `Notes) are not supported yet: the half-up round-off is only correct for non-negative totals.`,
    );
  }
  const rupees = Math.round(grandTotalBeforeRoundingPaise / 100); // half-up, ties up (non-negative only)
  const grandTotalPaise = rupees * 100;
  const roundOffPaise = grandTotalPaise - grandTotalBeforeRoundingPaise;
  return { grandTotalPaise, roundOffPaise };
}

const RATE_SET: ReadonlySet<number> = new Set(ALLOWED_GST_RATES);

// ---------------------------------------------------------------------------
// Supply type
// ---------------------------------------------------------------------------

/**
 * The ENTIRE rule: equal state codes → INTRA_STATE, else INTER_STATE.
 * Throws on any invalid code. No city strings, no hardcoded state literals.
 */
export function determineSupplyType(
  sellerStateCode: StateCode,
  placeOfSupplyStateCode: StateCode,
): SupplyType {
  if (!isValidStateCode(sellerStateCode)) {
    throw new GstValidationError("invalid_seller_state", `Invalid seller state code: ${sellerStateCode}`);
  }
  if (!isValidStateCode(placeOfSupplyStateCode)) {
    throw new GstValidationError("invalid_pos_state", `Invalid place-of-supply state code: ${placeOfSupplyStateCode}`);
  }
  return sellerStateCode === placeOfSupplyStateCode ? "INTRA_STATE" : "INTER_STATE";
}

// ---------------------------------------------------------------------------
// Place of supply
// ---------------------------------------------------------------------------

export interface PlaceOfSupplyInput {
  buyerGstin?: string | null;
  buyerStateCode?: StateCode | null;
  shipToStateCode?: StateCode | null;
  isBillToShipTo: boolean;
  isService: boolean;
}

export interface PlaceOfSupplyResult {
  stateCode: StateCode;
  basis: "buyer_gstin" | "buyer_address" | "delivery_location";
  confidence: "high" | "low";
}

/**
 * Resolve the place-of-supply state, or null if it cannot be determined (caller must then supply it).
 *
 * Precedence:
 *   1. Valid buyerGstin        → its state code            (basis buyer_gstin, high)
 *   2. buyerStateCode          → use it                    (basis buyer_address, high)
 *   3. shipToStateCode, ONLY when NOT bill-to/ship-to AND NOT a service (basis delivery_location, low)
 *   4. otherwise               → null
 *
 * CRITICAL — bill-to/ship-to (goods delivered to a third party at the buyer's direction, the normal
 * corporate-gifting case): the place of supply is the BUYER's location, NOT the delivery address.
 * A known buyer state (via GSTIN or buyer address) ALWAYS wins — the delivery address can only be
 * used as a last resort when the buyer's own location is unknown AND it is a plain goods shipment.
 */
export function resolvePlaceOfSupply(input: PlaceOfSupplyInput): PlaceOfSupplyResult | null {
  // 1. Buyer GSTIN is the strongest signal.
  if (input.buyerGstin != null && input.buyerGstin.trim() !== "") {
    const fromGstin = stateCodeFromGstin(input.buyerGstin);
    if (fromGstin) return { stateCode: fromGstin, basis: "buyer_gstin", confidence: "high" };
  }
  // 2. Buyer's own address state.
  if (input.buyerStateCode != null && isValidStateCode(input.buyerStateCode)) {
    return { stateCode: input.buyerStateCode, basis: "buyer_address", confidence: "high" };
  }
  // 3. Delivery location — ONLY when this is NOT a bill-to/ship-to and NOT a service, i.e. the buyer's
  //    own location is genuinely unknown and the goods simply ship somewhere. In a bill-to/ship-to
  //    supply the delivery address must NEVER stand in for the buyer state (steps 1–2 already won if
  //    the buyer state was known).
  if (
    !input.isBillToShipTo &&
    !input.isService &&
    input.shipToStateCode != null &&
    isValidStateCode(input.shipToStateCode)
  ) {
    return { stateCode: input.shipToStateCode, basis: "delivery_location", confidence: "low" };
  }
  // 4. Undeterminable — force the caller to supply it explicitly.
  return null;
}

// ---------------------------------------------------------------------------
// Core computation
// ---------------------------------------------------------------------------

export interface ComputeGstParams {
  sellerRegistrationId?: string;
  placeOfSupplyStateCode: StateCode;
  lines: GstLineInput[];
}

function assertInteger(value: number, code: string, label: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new GstValidationError(code, `${label} must be an integer paise value (got ${value}).`);
  }
}

function computeLine(line: GstLineInput, supplyType: SupplyType): GstLineResult {
  if (!Number.isFinite(line.quantity) || line.quantity < 0) {
    throw new GstValidationError("negative_quantity", `Line ${line.lineId}: quantity must be >= 0.`);
  }
  assertInteger(line.unitPricePaise, "invalid_unit_price", `Line ${line.lineId}: unitPricePaise`);
  if (line.unitPricePaise < 0) {
    throw new GstValidationError("negative_unit_price", `Line ${line.lineId}: unitPricePaise must be >= 0.`);
  }
  const discount = line.discountPaise ?? 0;
  assertInteger(discount, "invalid_discount", `Line ${line.lineId}: discountPaise`);
  if (discount < 0) {
    throw new GstValidationError("negative_discount", `Line ${line.lineId}: discountPaise must be >= 0.`);
  }
  if (!RATE_SET.has(line.gstRatePercent)) {
    throw new GstValidationError(
      "invalid_gst_rate",
      `Line ${line.lineId}: gstRatePercent ${line.gstRatePercent} is not one of ${ALLOWED_GST_RATES.join(", ")}.`,
    );
  }

  const grossPaise = roundHalfUp(line.quantity * line.unitPricePaise);
  if (discount > grossPaise) {
    throw new GstValidationError(
      "discount_exceeds_line",
      `Line ${line.lineId}: discount ${discount} exceeds line value ${grossPaise}.`,
    );
  }
  const taxableValuePaise = grossPaise - discount;
  const rate = line.gstRatePercent;

  let cgstRate = 0, cgstPaise = 0, sgstRate = 0, sgstPaise = 0, igstRate = 0, igstPaise = 0;
  if (supplyType === "INTRA_STATE") {
    // CGST and SGST are each HALF the rate, computed independently per line and rounded per line
    // (half-up). NOT halved from a combined figure.
    const halfRate = rate / 2;
    cgstRate = halfRate;
    sgstRate = halfRate;
    cgstPaise = roundHalfUp((taxableValuePaise * halfRate) / 100);
    sgstPaise = roundHalfUp((taxableValuePaise * halfRate) / 100);
  } else {
    igstRate = rate;
    igstPaise = roundHalfUp((taxableValuePaise * rate) / 100);
  }
  const totalTaxPaise = cgstPaise + sgstPaise + igstPaise;
  const lineTotalPaise = taxableValuePaise + totalTaxPaise;

  return {
    ...line,
    taxableValuePaise,
    cgstRatePercent: cgstRate,
    cgstPaise,
    sgstRatePercent: sgstRate,
    sgstPaise,
    igstRatePercent: igstRate,
    igstPaise,
    totalTaxPaise,
    lineTotalPaise,
  };
}

/** Compute a full GST breakdown. All money integer paise; line values and totals reconcile exactly. */
export function computeGst(params: ComputeGstParams): GstComputation {
  const sellerStateCode = sellerStateCodeFor(params.sellerRegistrationId);
  if (!isValidStateCode(params.placeOfSupplyStateCode)) {
    throw new GstValidationError("invalid_pos_state", `Invalid place-of-supply state code: ${params.placeOfSupplyStateCode}`);
  }
  if (!Array.isArray(params.lines) || params.lines.length === 0) {
    throw new GstValidationError("empty_lines", "At least one line is required.");
  }
  const supplyType = determineSupplyType(sellerStateCode, params.placeOfSupplyStateCode);

  const lines = params.lines.map((l) => computeLine(l, supplyType));

  // Totals are the SUM of already-rounded per-line values (never rounded independently).
  let totalTaxableValuePaise = 0;
  let totalCgstPaise = 0;
  let totalSgstPaise = 0;
  let totalIgstPaise = 0;
  for (const l of lines) {
    totalTaxableValuePaise += l.taxableValuePaise;
    totalCgstPaise += l.cgstPaise;
    totalSgstPaise += l.sgstPaise;
    totalIgstPaise += l.igstPaise;
  }
  const totalTaxPaise = totalCgstPaise + totalSgstPaise + totalIgstPaise;
  const grandTotalBeforeRoundingPaise = totalTaxableValuePaise + totalTaxPaise;

  // Finalise the grand total: Section-170 half-up rounding. This throws a typed error if the total
  // is ever negative (see roundGrandTotalToRupee) — a defensive guard for future Credit Note work,
  // since current per-line validation (discount capped at line value) cannot itself produce one.
  const { grandTotalPaise, roundOffPaise } = roundGrandTotalToRupee(grandTotalBeforeRoundingPaise);

  return {
    supplyType,
    sellerStateCode,
    placeOfSupplyStateCode: params.placeOfSupplyStateCode,
    lines,
    totalTaxableValuePaise,
    totalCgstPaise,
    totalSgstPaise,
    totalIgstPaise,
    totalTaxPaise,
    grandTotalBeforeRoundingPaise,
    roundOffPaise,
    grandTotalPaise,
    hsnSummary: buildHsnSummary(lines),
    rateSummary: buildRateSummary(lines),
  };
}

function buildHsnSummary(lines: GstLineResult[]): HsnSummaryRow[] {
  const map = new Map<string, HsnSummaryRow>();
  for (const l of lines) {
    const key = `${l.hsnOrSac}::${l.gstRatePercent}`;
    const row = map.get(key) ?? {
      hsnOrSac: l.hsnOrSac,
      gstRatePercent: l.gstRatePercent,
      taxableValuePaise: 0,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
      totalTaxPaise: 0,
    };
    row.taxableValuePaise += l.taxableValuePaise;
    row.cgstPaise += l.cgstPaise;
    row.sgstPaise += l.sgstPaise;
    row.igstPaise += l.igstPaise;
    row.totalTaxPaise += l.totalTaxPaise;
    map.set(key, row);
  }
  return [...map.values()];
}

function buildRateSummary(lines: GstLineResult[]): RateSummaryRow[] {
  const map = new Map<number, RateSummaryRow>();
  for (const l of lines) {
    const row = map.get(l.gstRatePercent) ?? {
      gstRatePercent: l.gstRatePercent,
      taxableValuePaise: 0,
      totalTaxPaise: 0,
    };
    row.taxableValuePaise += l.taxableValuePaise;
    row.totalTaxPaise += l.totalTaxPaise;
    map.set(l.gstRatePercent, row);
  }
  return [...map.values()];
}

// ---------------------------------------------------------------------------
// Amount in words (Indian numbering)
// ---------------------------------------------------------------------------

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

/** 1..99 → words; 0 → "". */
function twoDigits(n: number): string {
  if (n <= 0) return "";
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? " " + ONES[o] : ""}`;
}

/** 0..999 → words; 0 → "". */
function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(" ");
}

/** Non-negative integer rupees → Indian-system words. 0 → "Zero". */
function wholeToWords(num: number): string {
  if (num === 0) return "Zero";
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = num % 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${wholeToWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));
  return parts.join(" ").trim();
}

/**
 * Integer paise → "Rupees … Only" in the Indian numbering system, with paise when present.
 * Examples: 199900 → "Rupees One Thousand Nine Hundred Ninety Nine Only";
 *           150 → "Rupees One and Fifty Paise Only"; 0 → "Rupees Zero Only".
 */
export function amountInWordsIndian(paise: number): string {
  if (!Number.isFinite(paise) || !Number.isInteger(paise)) {
    throw new GstValidationError("invalid_paise", `amountInWordsIndian expects integer paise (got ${paise}).`);
  }
  const negative = paise < 0;
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const p = abs % 100;

  let words = `Rupees ${wholeToWords(rupees)}`;
  if (p > 0) words += ` and ${twoDigits(p)} Paise`;
  words += " Only";
  return negative ? `Minus ${words}` : words;
}
