import { describe, it, expect, vi, beforeEach } from "vitest";

// pricing.ts imports @/lib/supabase/admin (which begins with `import "server-only"`).
vi.mock("server-only", () => ({}));

// Fake the DB price lookup: getProductPricing does supa.from("products").select(...).in("sku", skus).
const h = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        in: (_col: string, skus: string[]) =>
          Promise.resolve({ data: h.rows.filter((r) => skus.includes(r.sku as string)), error: null }),
      }),
    }),
  }),
}));

import { calculatePricing, PricingError, type PricingInput } from "./pricing";

const PROD_A = {
  sku: "SKU-A",
  name: "Product A",
  cogs: 100,
  price_single: 500,
  price_bulk_25: 450,
  price_bulk_100: 400,
  margin_percent: 60,
};

function baseInput(products: PricingInput["products"]): PricingInput {
  return {
    products,
    kitCount: 1,
    packagingTier: "essential", // 125/kit
    rushOrder: false,
    personalisation: "name_only", // 0
    resumeIntelligence: false, // 0
  };
}

beforeEach(() => {
  h.rows = [PROD_A];
});

describe("pricing: custom/charge use their own price (no DB lookup)", () => {
  it("custom line uses its typed unitPrice", async () => {
    const r = await calculatePricing(
      baseInput([{ sku: "CUSTOM-1", source: "custom", name: "Bespoke", unitPrice: 1234, quantity: 2 }]),
    );
    expect(r.lineItems).toHaveLength(1);
    expect(r.lineItems[0].source).toBe("custom");
    expect(r.lineItems[0].productName).toBe("Bespoke");
    expect(r.lineItems[0].unitPrice).toBe(1234);
    expect(r.lineItems[0].lineTotal).toBe(2468);
    expect(r.subtotal).toBe(2468);
  });

  it("charge line forces quantity 1 and uses its amount", async () => {
    const r = await calculatePricing(
      baseInput([{ sku: "CHARGE-1", source: "charge", name: "Freight", unitPrice: 900, quantity: 5 }]),
    );
    expect(r.lineItems[0].source).toBe("charge");
    expect(r.lineItems[0].quantity).toBe(1);
    expect(r.lineItems[0].lineTotal).toBe(900);
  });

  it("custom/charge without a positive unitPrice throws PricingError", async () => {
    await expect(
      calculatePricing(baseInput([{ sku: "CUSTOM-1", source: "custom", name: "X", quantity: 1 }])),
    ).rejects.toBeInstanceOf(PricingError);
    await expect(
      calculatePricing(baseInput([{ sku: "C", source: "charge", name: "X", unitPrice: 0, quantity: 1 }])),
    ).rejects.toBeInstanceOf(PricingError);
  });
});

describe("pricing: catalogue fail-loud + override", () => {
  it("unknown catalogue SKU throws, naming the SKU", async () => {
    await expect(
      calculatePricing(baseInput([{ sku: "NOPE-404", quantity: 1 }])),
    ).rejects.toThrow(/NOPE-404/);
    // and it is the typed error with the right code
    try {
      await calculatePricing(baseInput([{ sku: "NOPE-404", quantity: 1 }]));
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(PricingError);
      expect((e as PricingError).code).toBe("unknown_sku");
    }
  });

  it("no silent 0: a catalogue line never prices at 0 for a missing SKU", async () => {
    await expect(
      calculatePricing(baseInput([{ sku: "GHOST", quantity: 3 }])),
    ).rejects.toBeInstanceOf(PricingError);
  });

  it("explicit unitPrice overrides the DB price and records the override", async () => {
    const r = await calculatePricing(baseInput([{ sku: "SKU-A", quantity: 1, unitPrice: 999 }]));
    expect(r.lineItems[0].unitPrice).toBe(999); // override, not price_single 500
    expect(r.lineItems[0].priceOverridden).toBe(true);

    const noOverride = await calculatePricing(baseInput([{ sku: "SKU-A", quantity: 1 }]));
    expect(noOverride.lineItems[0].unitPrice).toBe(500); // price_single tier
    expect(noOverride.lineItems[0].priceOverridden).toBe(false);
  });
});

describe("pricing: mixed catalogue + custom + charge reconciles exactly", () => {
  it("subtotal and grand total include every line", async () => {
    const r = await calculatePricing(
      baseInput([
        { sku: "SKU-A", quantity: 25 }, // catalogue -> price_bulk_25 450 * 25 = 11250
        { sku: "CUSTOM-1", source: "custom", name: "Bespoke", unitPrice: 1000, quantity: 2 }, // 2000
        { sku: "CHARGE-1", source: "charge", name: "Design fee", unitPrice: 500, quantity: 1 }, // 500
      ]),
    );
    expect(r.lineItems).toHaveLength(3);
    const sumLines = r.lineItems.reduce((s, li) => s + li.lineTotal, 0);
    expect(sumLines).toBe(11250 + 2000 + 500);
    expect(r.subtotal).toBe(sumLines);
    // essential packaging 125 * kitCount(1); no personalisation/resume/rush.
    expect(r.packagingTotal).toBe(125);
    expect(r.grandTotal).toBe(r.subtotal + r.packagingTotal);
  });
});
