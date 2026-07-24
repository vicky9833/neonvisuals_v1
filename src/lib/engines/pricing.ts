/**
 * Pricing Engine - INTERNAL USE ONLY.
 *
 * Phase 5B: PRICES ARE ALWAYS MANUAL. Every line carries a typed unitPrice (rupees). The engine
 * NEVER reads a price from the database (the catalogue has no prices by design) and NEVER produces
 * a 0 unit price silently — a line without a positive unitPrice is rejected (fail loud). The SKU on
 * a catalogue line is a label, not a price key.
 */
export type PackagingTierId = "essential" | "standard" | "premium" | "flagship";
export type PersonalisationLevelId = "name_only" | "name_occasion" | "full_personal";

/** Line origin. Absent on input = "catalogue" (back-compat with pre-5A quotes). */
export type QuoteLineSource = "catalogue" | "custom" | "charge";

/** GST slabs permitted on a line (validation only; quotes stay tax-exclusive this phase). */
export const ALLOWED_LINE_GST_RATES = [0, 0.25, 3, 5, 12, 18, 28] as const;

/** Typed pricing failure — never silently coerce a missing/unknown price. */
export class PricingError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PricingError";
    this.code = code;
  }
}

/**
 * A product/charge line fed into pricing.
 *   - catalogue (default): priced from the DB `products` table by SKU. An explicit unitPrice is a
 *     staff OVERRIDE of the DB price. Unknown SKU → throws (no silent 0).
 *   - custom: an off-catalogue product; carries its own name + unitPrice (no DB lookup).
 *   - charge: a non-product fee (freight, packing, design). qty forced to 1.
 */
export interface PricingProductInput {
  sku: string;
  quantity: number;
  source?: QuoteLineSource;
  name?: string;
  /** Rupees. REQUIRED for custom/charge; optional staff override for catalogue. */
  unitPrice?: number;
  gstRate?: number;
  hsn?: string;
  uqc?: string;
  notes?: string;
}

export interface PricingInput {
  products: PricingProductInput[];
  /** Number of kits (each kit contains the selected products). */
  kitCount: number;
  packagingTier: PackagingTierId;
  rushOrder: boolean;
  rushDays?: number;
  personalisation: PersonalisationLevelId;
  resumeIntelligence: boolean;
}

export interface PricingLineItem {
  sku: string;
  source: QuoteLineSource;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  cogs: number;
  marginPercent: number;
  /** True when a catalogue line's DB price was overridden by a staff-supplied unitPrice. */
  priceOverridden: boolean;
  gstRate?: number;
  hsn?: string;
  uqc?: string;
  notes?: string;
}

export interface PricingResult {
  lineItems: PricingLineItem[];
  subtotal: number;
  packagingCost: number;
  packagingTotal: number;
  personalisationPremium: number;
  personalisationTotal: number;
  resumeIntelligencePremium: number;
  resumeIntelligenceTotal: number;
  rushSurchargePercent: number;
  rushSurchargeAmount: number;
  subtotalBeforeRush: number;
  grandTotal: number;
  totalCogs: number;
  overallMarginPercent: number;
  perKitInvestment: number;
  kitCount: number;
}

export const PACKAGING_COST: Record<PackagingTierId, number> = {
  essential: 125,
  standard: 275,
  premium: 575,
  flagship: 1150,
};

export const PERSONALISATION_PREMIUM: Record<PersonalisationLevelId, number> = {
  name_only: 0,
  name_occasion: 50,
  full_personal: 150,
};

export const RESUME_INTELLIGENCE_PER_PERSON = 300;

function rushPercent(rushOrder: boolean, rushDays?: number): number {
  if (!rushOrder) return 0;
  if (rushDays === undefined || rushDays === null) return 20;
  if (rushDays <= 0) return 50; // same day
  if (rushDays < 2) return 35; // under 48 hours
  if (rushDays < 5) return 20; // under 5 working days
  return 0;
}

/**
 * Builds a single priced line. PRICE IS ALWAYS MANUAL: every line (catalogue, custom or charge)
 * must carry a positive typed unitPrice or it is REJECTED (fail loud) — there is no DB lookup and
 * no silent 0. For a catalogue line the SKU is a label only: a typed price is honoured even if the
 * SKU does not resolve in the catalogue.
 *
 * NOTE: PricingError code "unknown_sku" is retained for callers/back-compat, but with manual
 * pricing it is superseded by the "missing_line_price" rejection (a priced line is always accepted;
 * an unpriced line fails on price before any SKU concern).
 */
function buildLineItem(item: PricingProductInput): PricingLineItem {
  const source: QuoteLineSource = item.source ?? "catalogue";
  const quantity = source === "charge" ? 1 : Math.max(1, item.quantity || 1);

  if (item.unitPrice == null || !Number.isFinite(item.unitPrice) || item.unitPrice <= 0) {
    throw new PricingError(
      "missing_line_price",
      `Line "${item.name ?? item.sku}" (${source}) requires a typed unit price greater than 0.`,
    );
  }

  return {
    sku: item.sku,
    source,
    productName: item.name ?? item.sku,
    unitPrice: item.unitPrice,
    quantity,
    lineTotal: item.unitPrice * quantity,
    cogs: 0,
    marginPercent: 0,
    priceOverridden: false,
    gstRate: item.gstRate,
    hsn: item.hsn,
    uqc: item.uqc,
    notes: item.notes,
  };
}

/** Calculates the full pricing result. Prices are manual (no DB access); pure + synchronous work. */
export async function calculatePricing(input: PricingInput): Promise<PricingResult> {
  const kitCount = Math.max(1, input.kitCount || 1);
  const lineItems: PricingLineItem[] = input.products.map((item) => buildLineItem(item));

  const subtotal = lineItems.reduce((s, li) => s + li.lineTotal, 0);
  const totalCogs = lineItems.reduce((s, li) => s + li.cogs * li.quantity, 0);

  const packagingCost = PACKAGING_COST[input.packagingTier];
  const packagingTotal = packagingCost * kitCount;

  const personalisationPremium = PERSONALISATION_PREMIUM[input.personalisation];
  const personalisationTotal = personalisationPremium * kitCount;

  const resumeIntelligencePremium = input.resumeIntelligence ? RESUME_INTELLIGENCE_PER_PERSON : 0;
  const resumeIntelligenceTotal = resumeIntelligencePremium * kitCount;

  const subtotalBeforeRush =
    subtotal + packagingTotal + personalisationTotal + resumeIntelligenceTotal;

  const rushSurchargePercent = rushPercent(input.rushOrder, input.rushDays);
  const rushSurchargeAmount = Math.round((subtotalBeforeRush * rushSurchargePercent) / 100);

  const grandTotal = subtotalBeforeRush + rushSurchargeAmount;
  const perKitInvestment = Math.round(grandTotal / kitCount);
  const overallMarginPercent =
    subtotal > 0 ? Math.round(((subtotal - totalCogs) / subtotal) * 100) : 0;

  return {
    lineItems,
    subtotal,
    packagingCost,
    packagingTotal,
    personalisationPremium,
    personalisationTotal,
    resumeIntelligencePremium,
    resumeIntelligenceTotal,
    rushSurchargePercent,
    rushSurchargeAmount,
    subtotalBeforeRush,
    grandTotal,
    totalCogs,
    overallMarginPercent,
    perKitInvestment,
    kitCount,
  };
}

/* ------------------------------------------------------------------ */
/* Lightweight kit totals (pure) - used by the Gift Builder engine.    */
/* No DB access; safe to compute anywhere.                             */
/* ------------------------------------------------------------------ */

export interface QuoteTotals {
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
}

/** Sums simple unit-price �- quantity line items into kit totals. */
export function computeQuoteTotals(
  items: Array<{ unitPrice: number; quantity: number }>,
): QuoteTotals {
  const totalQuantity = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const subtotal = items.reduce((sum, i) => sum + (i.unitPrice || 0) * (i.quantity || 0), 0);
  return { itemCount: items.length, totalQuantity, subtotal };
}
