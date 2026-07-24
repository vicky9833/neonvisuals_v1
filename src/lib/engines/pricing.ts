/**
 * Pricing Engine - INTERNAL USE ONLY.
 * Never import from public routes or client components. Reads prices ONLY from
 * the Supabase database (service role), never from products.ts.
 */
import { createAdminClient } from "@/lib/supabase/admin";

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

interface ProductPricing {
  name: string;
  cogs: number;
  price_single: number;
  price_bulk_25: number;
  price_bulk_100: number;
  margin_percent: number;
}

/** Fetches only the price columns for the given SKUs from the database. */
export async function getProductPricing(
  skus: string[],
): Promise<Record<string, ProductPricing>> {
  if (skus.length === 0) return {};
  const supa = createAdminClient();
  const { data, error } = await supa
    .from("products")
    .select("sku, name, cogs, price_single, price_bulk_25, price_bulk_100, margin_percent")
    .in("sku", skus);
  if (error) throw new Error(`Pricing fetch failed: ${error.message}`);
  const map: Record<string, ProductPricing> = {};
  for (const row of data ?? []) {
    map[row.sku as string] = {
      name: (row.name as string) ?? row.sku,
      cogs: Number(row.cogs ?? 0),
      price_single: Number(row.price_single ?? 0),
      price_bulk_25: Number(row.price_bulk_25 ?? 0),
      price_bulk_100: Number(row.price_bulk_100 ?? 0),
      margin_percent: Number(row.margin_percent ?? 0),
    };
  }
  return map;
}

/** Selects the unit price for a given order quantity tier. */
function unitPriceForQuantity(p: ProductPricing, quantity: number): number {
  if (quantity >= 100) return p.price_bulk_100;
  if (quantity >= 25) return p.price_bulk_25;
  return p.price_single;
}

function rushPercent(rushOrder: boolean, rushDays?: number): number {
  if (!rushOrder) return 0;
  if (rushDays === undefined || rushDays === null) return 20;
  if (rushDays <= 0) return 50; // same day
  if (rushDays < 2) return 35; // under 48 hours
  if (rushDays < 5) return 20; // under 5 working days
  return 0;
}

/**
 * Builds a single priced line. Custom/charge lines use their OWN unitPrice (no DB lookup); a
 * catalogue line MUST resolve in the DB price map (else throws), and an explicit unitPrice on a
 * catalogue line is a recorded staff override of the DB price.
 */
function buildLineItem(
  item: PricingProductInput,
  pricingMap: Record<string, ProductPricing>,
): PricingLineItem {
  const source: QuoteLineSource = item.source ?? "catalogue";

  if (source === "custom" || source === "charge") {
    if (item.unitPrice == null || !Number.isFinite(item.unitPrice) || item.unitPrice <= 0) {
      throw new PricingError(
        "missing_line_price",
        `${source} line "${item.name ?? item.sku}" requires a positive unitPrice.`,
      );
    }
    // A charge (freight/packing/design) is a single non-product fee; quantity is forced to 1.
    const quantity = source === "charge" ? 1 : Math.max(1, item.quantity || 1);
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

  // Catalogue line: the SKU MUST resolve — fail loud, never price at 0.
  const p = pricingMap[item.sku];
  const quantity = Math.max(1, item.quantity || 1);
  if (!p) {
    throw new PricingError(
      "unknown_sku",
      `Unknown product SKU "${item.sku}": not found in the catalogue price list. Use a custom line for off-catalogue items.`,
    );
  }
  const overridden = item.unitPrice != null;
  if (overridden && (!Number.isFinite(item.unitPrice as number) || (item.unitPrice as number) <= 0)) {
    throw new PricingError(
      "invalid_override_price",
      `Override price for SKU "${item.sku}" must be a positive number.`,
    );
  }
  const unitPrice = overridden ? (item.unitPrice as number) : unitPriceForQuantity(p, quantity);
  return {
    sku: item.sku,
    source: "catalogue",
    productName: p.name,
    unitPrice,
    quantity,
    lineTotal: unitPrice * quantity,
    cogs: p.cogs,
    marginPercent: p.margin_percent,
    priceOverridden: overridden,
    gstRate: item.gstRate,
    hsn: item.hsn,
    uqc: item.uqc,
    notes: item.notes,
  };
}

/** Calculates the full pricing result (server-side; fetches DB prices for catalogue lines only). */
export async function calculatePricing(input: PricingInput): Promise<PricingResult> {
  const kitCount = Math.max(1, input.kitCount || 1);
  // Only catalogue lines are looked up in the DB; custom/charge lines carry their own price.
  const catalogueSkus = input.products
    .filter((p) => (p.source ?? "catalogue") === "catalogue")
    .map((p) => p.sku);
  const pricingMap = await getProductPricing(catalogueSkus);

  const lineItems: PricingLineItem[] = input.products.map((item) => buildLineItem(item, pricingMap));

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
