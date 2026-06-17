import { computeQuoteTotals, type QuoteTotals } from "@/lib/engines/pricing";

/**
 * Gift Builder engine — powers the visual kit configurator (the killer
 * differentiator). Validates kit composition and computes kit pricing.
 */
export interface BuilderItem {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

/** Computes pricing totals for a configured kit. */
export function computeKitTotals(items: BuilderItem[]): QuoteTotals {
  return computeQuoteTotals(
    items.map((item) => ({
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    })),
  );
}

/** A kit needs at least one item to be valid. */
export function isKitValid(items: BuilderItem[]): boolean {
  return items.length > 0 && items.every((item) => item.quantity > 0);
}
