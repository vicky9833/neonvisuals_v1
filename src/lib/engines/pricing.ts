/**
 * Pricing Engine - INTERNAL USE ONLY.
 * Never import from public routes or client components. Reads prices ONLY from
 * the Supabase database (service role), never from products.ts.
 */
import { createAdminClient } from "@/lib/supabase/admin";

export type PackagingTierId = "essential" | "standard" | "premium" | "flagship";
export type PersonalisationLevelId = "name_only" | "name_occasion" | "full_personal";

export interface PricingInput {
  products: Array<{ sku: string; quantity: number }>;
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
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  cogs: number;
  marginPercent: number;
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

/** Calculates the full pricing result (server-side; fetches DB prices). */
export async function calculatePricing(input: PricingInput): Promise<PricingResult> {
  const kitCount = Math.max(1, input.kitCount || 1);
  const pricingMap = await getProductPricing(input.products.map((p) => p.sku));

  const lineItems: PricingLineItem[] = input.products.map((item) => {
    const p = pricingMap[item.sku];
    const quantity = Math.max(1, item.quantity || 1);
    const unitPrice = p ? unitPriceForQuantity(p, quantity) : 0;
    return {
      sku: item.sku,
      productName: p?.name ?? item.sku,
      unitPrice,
      quantity,
      lineTotal: unitPrice * quantity,
      cogs: p?.cogs ?? 0,
      marginPercent: p?.margin_percent ?? 0,
    };
  });

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
