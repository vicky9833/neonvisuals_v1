import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  determineSupplyType,
  resolvePlaceOfSupply,
  computeGst,
  amountInWordsIndian,
} from "./service";
import { ALLOWED_GST_RATES, GstValidationError, type GstLineInput } from "./types";
import { STATE_CODES, type StateCode } from "./state-codes";

const SELLER = "27"; // Maharashtra (default registration)

function line(overrides: Partial<GstLineInput> = {}): GstLineInput {
  return {
    lineId: "L1",
    description: "Gift",
    hsnOrSac: "9503",
    isService: false,
    quantity: 1,
    unitPricePaise: 100000, // ₹1000
    gstRatePercent: 18,
    ...overrides,
  };
}

describe("determineSupplyType", () => {
  it("[CROWN #1] Karnataka buyer (29) + MH seller (27) → INTER_STATE → IGST only", () => {
    expect(determineSupplyType(SELLER, "29")).toBe("INTER_STATE");
    const c = computeGst({ placeOfSupplyStateCode: "29", lines: [line()] });
    expect(c.supplyType).toBe("INTER_STATE");
    expect(c.totalCgstPaise).toBe(0);
    expect(c.totalSgstPaise).toBe(0);
    expect(c.totalIgstPaise).toBe(c.totalTaxPaise);
    expect(c.totalIgstPaise).toBe(18000); // 18% of ₹1000
  });

  it("[CROWN #2] Maharashtra buyer (27) + MH seller (27) → INTRA_STATE → CGST+SGST, IGST=0", () => {
    expect(determineSupplyType(SELLER, "27")).toBe("INTRA_STATE");
    const c = computeGst({ placeOfSupplyStateCode: "27", lines: [line()] });
    expect(c.supplyType).toBe("INTRA_STATE");
    expect(c.totalIgstPaise).toBe(0);
    expect(c.totalCgstPaise).toBe(9000);
    expect(c.totalSgstPaise).toBe(9000);
    expect(c.totalCgstPaise + c.totalSgstPaise).toBe(c.totalTaxPaise);
  });

  it("[#3] exactly ONE of state codes 01–38 is INTRA_STATE against seller 27", () => {
    let intra = 0;
    for (let n = 1; n <= 38; n += 1) {
      const code = String(n).padStart(2, "0");
      if (!(code in STATE_CODES)) continue;
      if (determineSupplyType(SELLER, code as StateCode) === "INTRA_STATE") intra += 1;
    }
    expect(intra).toBe(1);
  });

  it("throws on invalid state codes", () => {
    expect(() => determineSupplyType("27", "39" as StateCode)).toThrow(GstValidationError);
    expect(() => determineSupplyType("00" as StateCode, "27")).toThrow(GstValidationError);
  });
});

describe("computeGst reconciliation [#4]", () => {
  it("cgst+sgst === totalTax (intra); igst === totalTax (inter) — always", () => {
    const intra = computeGst({ placeOfSupplyStateCode: "27", lines: [line(), line({ lineId: "L2", gstRatePercent: 12 })] });
    expect(intra.totalCgstPaise + intra.totalSgstPaise).toBe(intra.totalTaxPaise);
    expect(intra.totalIgstPaise).toBe(0);

    const inter = computeGst({ placeOfSupplyStateCode: "29", lines: [line(), line({ lineId: "L2", gstRatePercent: 5 })] });
    expect(inter.totalIgstPaise).toBe(inter.totalTaxPaise);
    expect(inter.totalCgstPaise + inter.totalSgstPaise).toBe(0);
  });

  it("line values reconcile to totals exactly", () => {
    const c = computeGst({ placeOfSupplyStateCode: "27", lines: [line(), line({ lineId: "L2", gstRatePercent: 5 })] });
    const sumTaxable = c.lines.reduce((s, l) => s + l.taxableValuePaise, 0);
    const sumTax = c.lines.reduce((s, l) => s + l.totalTaxPaise, 0);
    expect(sumTaxable).toBe(c.totalTaxableValuePaise);
    expect(sumTax).toBe(c.totalTaxPaise);
    expect(c.grandTotalBeforeRoundingPaise).toBe(sumTaxable + sumTax);
  });
});

describe("[#7] multi-slab invoice", () => {
  it("produces correct per-slab rateSummary and hsnSummary", () => {
    const c = computeGst({
      placeOfSupplyStateCode: "29", // inter → IGST
      lines: [
        line({ lineId: "A", hsnOrSac: "1905", gstRatePercent: 5, unitPricePaise: 100000 }),
        line({ lineId: "B", hsnOrSac: "4820", gstRatePercent: 12, unitPricePaise: 100000 }),
        line({ lineId: "C", hsnOrSac: "9503", gstRatePercent: 18, unitPricePaise: 100000 }),
      ],
    });
    const rates = new Map(c.rateSummary.map((r) => [r.gstRatePercent, r]));
    expect(rates.get(5)!.totalTaxPaise).toBe(5000);
    expect(rates.get(12)!.totalTaxPaise).toBe(12000);
    expect(rates.get(18)!.totalTaxPaise).toBe(18000);
    expect(c.rateSummary).toHaveLength(3);
    expect(c.hsnSummary).toHaveLength(3);
    expect(c.hsnSummary.find((h) => h.hsnOrSac === "1905")!.igstPaise).toBe(5000);
    expect(c.totalTaxPaise).toBe(35000);
  });
});

// ---------------------------------------------------------------------------
// Property tests (#5, #6) — fast-check
// ---------------------------------------------------------------------------

const VALID_CODES = Object.keys(STATE_CODES) as StateCode[];

const lineArb: fc.Arbitrary<GstLineInput> = fc
  .record({
    q: fc.integer({ min: 1, max: 500 }),
    u: fc.integer({ min: 0, max: 5_000_00 }),
    r: fc.constantFrom(...ALLOWED_GST_RATES),
    discFrac: fc.integer({ min: 0, max: 99 }),
    hsn: fc.constantFrom("9503", "4820", "1905", "998396"),
    svc: fc.boolean(),
  })
  .map(({ q, u, r, discFrac, hsn, svc }) => {
    const gross = Math.floor(q * u + 0.5);
    const discountPaise = Math.floor((gross * discFrac) / 100); // always <= gross
    return {
      lineId: `L-${q}-${u}`,
      description: "x",
      hsnOrSac: hsn,
      isService: svc,
      quantity: q,
      unitPricePaise: u,
      discountPaise,
      gstRatePercent: r,
    };
  });

describe("property [#5] taxable values reconcile", () => {
  it("sum of line taxable === totalTaxableValuePaise, exactly", () => {
    fc.assert(
      fc.property(fc.array(lineArb, { minLength: 1, maxLength: 8 }), fc.constantFrom(...VALID_CODES), (lines, pos) => {
        const c = computeGst({ placeOfSupplyStateCode: pos, lines });
        const sum = c.lines.reduce((s, l) => s + l.taxableValuePaise, 0);
        expect(sum).toBe(c.totalTaxableValuePaise);
        // Tax reconciliation too.
        if (c.supplyType === "INTRA_STATE") {
          expect(c.totalCgstPaise + c.totalSgstPaise).toBe(c.totalTaxPaise);
          expect(c.totalIgstPaise).toBe(0);
        } else {
          expect(c.totalIgstPaise).toBe(c.totalTaxPaise);
        }
      }),
      { numRuns: 300 },
    );
  });
});

describe("property [#6] round-off invariants", () => {
  it("grandTotalPaise is a multiple of 100 and roundOffPaise ∈ [-50, 49]", () => {
    fc.assert(
      fc.property(fc.array(lineArb, { minLength: 1, maxLength: 8 }), fc.constantFrom(...VALID_CODES), (lines, pos) => {
        const c = computeGst({ placeOfSupplyStateCode: pos, lines });
        expect(c.grandTotalPaise % 100).toBe(0);
        expect(c.roundOffPaise).toBeGreaterThanOrEqual(-50);
        expect(c.roundOffPaise).toBeLessThanOrEqual(49);
        expect(c.grandTotalPaise).toBe(c.grandTotalBeforeRoundingPaise + c.roundOffPaise);
      }),
      { numRuns: 500 },
    );
  });
});

// ---------------------------------------------------------------------------
// resolvePlaceOfSupply (#9) — bill-to/ship-to: buyer wins
// ---------------------------------------------------------------------------

describe("resolvePlaceOfSupply [#9]", () => {
  it("bill-to Karnataka / ship-to Delhi with isBillToShipTo=true → Karnataka (delivery loses)", () => {
    const r = resolvePlaceOfSupply({
      buyerStateCode: "29",
      shipToStateCode: "07",
      isBillToShipTo: true,
      isService: false,
    });
    expect(r).toEqual({ stateCode: "29", basis: "buyer_address", confidence: "high" });
  });

  it("buyer GSTIN wins over everything", () => {
    const r = resolvePlaceOfSupply({
      buyerGstin: "27BZSPV5411Q1ZA",
      buyerStateCode: "07",
      shipToStateCode: "29",
      isBillToShipTo: true,
      isService: false,
    });
    expect(r).toEqual({ stateCode: "27", basis: "buyer_gstin", confidence: "high" });
  });

  it("delivery location used ONLY for plain goods with no known buyer state", () => {
    const r = resolvePlaceOfSupply({ shipToStateCode: "07", isBillToShipTo: false, isService: false });
    expect(r).toEqual({ stateCode: "07", basis: "delivery_location", confidence: "low" });
  });

  it("bill-to/ship-to with no buyer state → null (never falls back to delivery)", () => {
    expect(
      resolvePlaceOfSupply({ shipToStateCode: "07", isBillToShipTo: true, isService: false }),
    ).toBeNull();
  });

  it("service with no buyer state → null (delivery never applies to a service)", () => {
    expect(
      resolvePlaceOfSupply({ shipToStateCode: "07", isBillToShipTo: false, isService: true }),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// amountInWordsIndian (#10)
// ---------------------------------------------------------------------------

describe("amountInWordsIndian [#10]", () => {
  it("handles the required values (input is integer PAISE)", () => {
    expect(amountInWordsIndian(0)).toBe("Rupees Zero Only");
    expect(amountInWordsIndian(1)).toBe("Rupees Zero and One Paise Only"); // 1 paise
    expect(amountInWordsIndian(99)).toBe("Rupees Zero and Ninety Nine Paise Only");
    expect(amountInWordsIndian(100)).toBe("Rupees One Only");
    expect(amountInWordsIndian(199900)).toBe("Rupees One Thousand Nine Hundred Ninety Nine Only");
    // 10000000 paise = ₹1,00,000 = One Lakh (spec labelled this "1 crore" — see report; the value is 1 lakh).
    expect(amountInWordsIndian(10000000)).toBe("Rupees One Lakh Only");
    // A true crore: 1,00,00,000 rupees = 1e9 paise.
    expect(amountInWordsIndian(1000000000)).toBe("Rupees One Crore Only");
    // A value with paise.
    expect(amountInWordsIndian(199950)).toBe("Rupees One Thousand Nine Hundred Ninety Nine and Fifty Paise Only");
  });
});

// ---------------------------------------------------------------------------
// Rejection tests (#11)
// ---------------------------------------------------------------------------

describe("rejection [#11] — typed GstValidationError, never silent coercion", () => {
  it("empty lines array", () => {
    expect(() => computeGst({ placeOfSupplyStateCode: "27", lines: [] })).toThrow(GstValidationError);
  });
  it("invalid place-of-supply state", () => {
    expect(() => computeGst({ placeOfSupplyStateCode: "39" as StateCode, lines: [line()] })).toThrow(GstValidationError);
  });
  it("negative quantity", () => {
    expect(() => computeGst({ placeOfSupplyStateCode: "27", lines: [line({ quantity: -1 })] })).toThrow(/quantity/);
  });
  it("negative unit price", () => {
    expect(() => computeGst({ placeOfSupplyStateCode: "27", lines: [line({ unitPricePaise: -100 })] })).toThrow(GstValidationError);
  });
  it("discount exceeding line value", () => {
    expect(() =>
      computeGst({ placeOfSupplyStateCode: "27", lines: [line({ unitPricePaise: 100, quantity: 1, discountPaise: 101 })] }),
    ).toThrow(/discount/);
  });
  it("gst rate not in the allowed set", () => {
    expect(() => computeGst({ placeOfSupplyStateCode: "27", lines: [line({ gstRatePercent: 15 })] })).toThrow(/gstRatePercent/);
  });
  it("non-integer unit price (money must be integer paise)", () => {
    expect(() => computeGst({ placeOfSupplyStateCode: "27", lines: [line({ unitPricePaise: 100.5 })] })).toThrow(GstValidationError);
  });
});
