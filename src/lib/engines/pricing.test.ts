import { describe, it, expect } from "vitest";
import { calculatePricing, PricingError, type PricingInput } from "./pricing";

// Phase 5B: pricing is manual + pure (no DB). No mocks needed.
function baseInput(products: PricingInput["products"]): PricingInput {
  return {
    products,
    kitCount: 1,
    packagingTier: "essential", // 125/kit
    rushOrder: false,
    personalisation: "name_only", // 0
    resumeIntelligence: false,
  };
}

describe("pricing is always manual", () => {
  it("catalogue line WITHOUT a typed price is rejected (fail loud, never silent 0)", async () => {
    await expect(
      calculatePricing(baseInput([{ sku: "NV-A-001", quantity: 10 }])),
    ).rejects.toBeInstanceOf(PricingError);
    try {
      await calculatePricing(baseInput([{ sku: "NV-A-001", quantity: 10 }]));
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(PricingError);
      expect((e as PricingError).code).toBe("missing_line_price");
    }
  });

  it("catalogue line WITH a typed price and an UNRESOLVABLE SKU succeeds at the typed price", async () => {
    const r = await calculatePricing(baseInput([{ sku: "GHOST-SKU-999", quantity: 4, unitPrice: 250 }]));
    expect(r.lineItems[0].source).toBe("catalogue");
    expect(r.lineItems[0].unitPrice).toBe(250); // typed price is authoritative; SKU is a label
    expect(r.lineItems[0].lineTotal).toBe(1000);
    expect(r.subtotal).toBe(1000);
  });

  it("custom line uses its typed price + name", async () => {
    const r = await calculatePricing(
      baseInput([{ sku: "CUSTOM-1", source: "custom", name: "Bespoke", unitPrice: 1234, quantity: 2 }]),
    );
    expect(r.lineItems[0].productName).toBe("Bespoke");
    expect(r.lineItems[0].unitPrice).toBe(1234);
    expect(r.lineItems[0].lineTotal).toBe(2468);
  });

  it("charge forces quantity 1", async () => {
    const r = await calculatePricing(
      baseInput([{ sku: "CHARGE-1", source: "charge", name: "Freight", unitPrice: 900, quantity: 5 }]),
    );
    expect(r.lineItems[0].quantity).toBe(1);
    expect(r.lineItems[0].lineTotal).toBe(900);
  });

  it("no code path yields a 0 unit price silently: 0 / negative / undefined all throw for any source", async () => {
    for (const bad of [0, -5, undefined]) {
      await expect(
        calculatePricing(baseInput([{ sku: "X", quantity: 1, unitPrice: bad as number | undefined }])),
      ).rejects.toBeInstanceOf(PricingError);
    }
    for (const src of ["custom", "charge"] as const) {
      await expect(
        calculatePricing(baseInput([{ sku: "X", source: src, name: "n", quantity: 1, unitPrice: 0 }])),
      ).rejects.toBeInstanceOf(PricingError);
    }
  });

  it("mixed catalogue + custom + charge totals reconcile exactly", async () => {
    const r = await calculatePricing(
      baseInput([
        { sku: "NV-A-001", quantity: 25, unitPrice: 450 }, // catalogue typed price -> 11250
        { sku: "CUSTOM-1", source: "custom", name: "Bespoke", unitPrice: 1000, quantity: 2 }, // 2000
        { sku: "CHARGE-1", source: "charge", name: "Design fee", unitPrice: 500, quantity: 1 }, // 500
      ]),
    );
    const sumLines = r.lineItems.reduce((s, li) => s + li.lineTotal, 0);
    expect(sumLines).toBe(13750);
    expect(r.subtotal).toBe(13750);
    expect(r.packagingTotal).toBe(125); // essential 125 * 1 kit
    expect(r.grandTotal).toBe(r.subtotal + r.packagingTotal);
  });
});
