import { describe, it, expect, vi } from "vitest";

// quote.ts transitively imports pricing.ts -> @/lib/supabase/admin (server-only).
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

import { parseQuoteProductLine, QuoteValidationError } from "./quote";

describe("parseQuoteProductLine: back-compat with the old shape", () => {
  it("a line with NONE of the new fields parses as a catalogue line", () => {
    const line = parseQuoteProductLine({ sku: "NV-A-001", quantity: 25, unitPrice: 450, lineTotal: 11250 });
    expect(line.source).toBe("catalogue");
    expect(line.sku).toBe("NV-A-001");
    expect(line.quantity).toBe(25);
    expect(line.unitPrice).toBe(450);
    expect(line.lineTotal).toBe(11250);
    expect(line.name).toBeUndefined();
    expect(line.hsn).toBeUndefined();
    expect(line.gstRate).toBeUndefined();
  });

  it("derives lineTotal when absent (old rows are still fine)", () => {
    const line = parseQuoteProductLine({ sku: "X", quantity: 2, unitPrice: 100 });
    expect(line.lineTotal).toBe(200);
  });
});

describe("parseQuoteProductLine: new custom/charge shapes", () => {
  it("parses a full custom line", () => {
    const line = parseQuoteProductLine({
      sku: "CUSTOM-1",
      source: "custom",
      name: "Bespoke box",
      quantity: 3,
      unitPrice: 2500,
      lineTotal: 7500,
      hsn: "4819",
      gstRate: 18,
      uqc: "BOX",
      notes: "hand-finished",
    });
    expect(line.source).toBe("custom");
    expect(line.name).toBe("Bespoke box");
    expect(line.hsn).toBe("4819");
    expect(line.gstRate).toBe(18);
    expect(line.uqc).toBe("BOX");
  });

  it("parses a charge line (quantity 1)", () => {
    const line = parseQuoteProductLine({ source: "charge", sku: "CHARGE-1", name: "Freight", quantity: 1, unitPrice: 900, lineTotal: 900 });
    expect(line.source).toBe("charge");
    expect(line.name).toBe("Freight");
  });
});

describe("parseQuoteProductLine: rejections (typed QuoteValidationError)", () => {
  it("custom line without a name", () => {
    expect(() => parseQuoteProductLine({ source: "custom", sku: "C", quantity: 1, unitPrice: 100 })).toThrow(QuoteValidationError);
  });
  it("custom line without a positive unitPrice", () => {
    expect(() => parseQuoteProductLine({ source: "custom", name: "X", quantity: 1, unitPrice: 0 })).toThrow(/unit price/);
  });
  it("gstRate outside the allowed set", () => {
    expect(() => parseQuoteProductLine({ sku: "A", quantity: 1, unitPrice: 1, lineTotal: 1, gstRate: 7 })).toThrow(QuoteValidationError);
  });
  it("hsn that is not 4-8 digits", () => {
    expect(() => parseQuoteProductLine({ sku: "A", quantity: 1, unitPrice: 1, lineTotal: 1, hsn: "12" })).toThrow(/HSN/);
  });
  it("uqc not in the allowed set", () => {
    expect(() => parseQuoteProductLine({ sku: "A", quantity: 1, unitPrice: 1, lineTotal: 1, uqc: "LITRE" })).toThrow(QuoteValidationError);
  });
  it("catalogue line without a sku", () => {
    expect(() => parseQuoteProductLine({ quantity: 1, unitPrice: 1, lineTotal: 1 })).toThrow(/sku/);
  });
  it("non-object input", () => {
    expect(() => parseQuoteProductLine(null)).toThrow(QuoteValidationError);
  });
});
