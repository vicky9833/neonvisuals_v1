import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  determineSupplyType,
  resolvePlaceOfSupply,
  computeGst,
  amountInWordsIndian,
  roundGrandTotalToRupee,
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
  it("grandTotalPaise is a multiple of 100 and roundOffPaise ∈ [-49, +50] (S.170 half-up)", () => {
    fc.assert(
      fc.property(fc.array(lineArb, { minLength: 1, maxLength: 8 }), fc.constantFrom(...VALID_CODES), (lines, pos) => {
        const c = computeGst({ placeOfSupplyStateCode: pos, lines });
        expect(c.grandTotalPaise % 100).toBe(0);
        expect(c.roundOffPaise).toBeGreaterThanOrEqual(-49);
        expect(c.roundOffPaise).toBeLessThanOrEqual(50);
        expect(c.grandTotalPaise).toBe(c.grandTotalBeforeRoundingPaise + c.roundOffPaise);
      }),
      { numRuns: 500 },
    );
  });

  it("[S.170] a total ending in exactly 50 paise rounds UP (roundOff +50)", () => {
    // 0% GST so grand total == taxable == unitPrice; 199950 paise ends in 50 → rounds up to 200000.
    const c = computeGst({
      placeOfSupplyStateCode: "27",
      lines: [line({ gstRatePercent: 0, unitPricePaise: 199950, quantity: 1 })],
    });
    expect(c.grandTotalBeforeRoundingPaise).toBe(199950);
    expect(c.roundOffPaise).toBe(50);
    expect(c.grandTotalPaise).toBe(200000);
  });

  it("[S.170] a total ending in 49 paise rounds DOWN (roundOff -49)", () => {
    const c = computeGst({
      placeOfSupplyStateCode: "27",
      lines: [line({ gstRatePercent: 0, unitPricePaise: 199949, quantity: 1 })],
    });
    expect(c.grandTotalBeforeRoundingPaise).toBe(199949);
    expect(c.roundOffPaise).toBe(-49);
    expect(c.grandTotalPaise).toBe(199900);
  });
});

// ---------------------------------------------------------------------------
// totalTax = sum of independently-rounded heads (CORRECTION 2)
// ---------------------------------------------------------------------------

describe("totalTax is the sum of independently-rounded CGST/SGST/IGST heads", () => {
  it("taxable=5 paise @18%: INTRA heads each round to 0 → totalTax 0", () => {
    // taxable = quantity(1) * unitPrice(5) = 5 paise. CGST = roundHalfUp(5*9/100)=roundHalfUp(0.45)=0,
    // SGST = 0, so totalTax = 0 — each head rounded on its own, not from a combined 0.90.
    const c = computeGst({
      placeOfSupplyStateCode: "27",
      lines: [line({ gstRatePercent: 18, unitPricePaise: 5, quantity: 1 })],
    });
    expect(c.lines[0].taxableValuePaise).toBe(5);
    expect(c.lines[0].cgstPaise).toBe(0);
    expect(c.lines[0].sgstPaise).toBe(0);
    expect(c.lines[0].totalTaxPaise).toBe(0);
    expect(c.totalTaxPaise).toBe(0);
  });

  it("taxable=5 paise @18%: INTER igst rounds 0.90 → 1 → totalTax 1 (diverges from intra)", () => {
    // The SAME taxable value produces a DIFFERENT total tax inter-state, because IGST rounds the full
    // 0.90 to 1, whereas the two intra heads each round 0.45 down to 0. This divergence is correct.
    const c = computeGst({
      placeOfSupplyStateCode: "29",
      lines: [line({ gstRatePercent: 18, unitPricePaise: 5, quantity: 1 })],
    });
    expect(c.lines[0].taxableValuePaise).toBe(5);
    expect(c.lines[0].igstPaise).toBe(1);
    expect(c.lines[0].totalTaxPaise).toBe(1);
    expect(c.totalTaxPaise).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Additional coverage (CORRECTION 4)
// ---------------------------------------------------------------------------

describe("additional coverage", () => {
  it("(a) 0% line: all heads 0 but taxable is still carried into totals + summaries", () => {
    const c = computeGst({
      placeOfSupplyStateCode: "27",
      lines: [line({ gstRatePercent: 0, unitPricePaise: 100000, quantity: 1, hsnOrSac: "4901" })],
    });
    expect(c.totalCgstPaise).toBe(0);
    expect(c.totalSgstPaise).toBe(0);
    expect(c.totalIgstPaise).toBe(0);
    expect(c.totalTaxableValuePaise).toBe(100000);
    expect(c.rateSummary.find((r) => r.gstRatePercent === 0)!.taxableValuePaise).toBe(100000);
    expect(c.hsnSummary.find((h) => h.hsnOrSac === "4901")!.taxableValuePaise).toBe(100000);
  });

  it("(b) 0.25% and 3% rates with fractional-paise amounts reconcile", () => {
    const c = computeGst({
      placeOfSupplyStateCode: "29", // inter → IGST
      lines: [
        line({ lineId: "Q", gstRatePercent: 0.25, unitPricePaise: 333333, quantity: 1, hsnOrSac: "7113" }),
        line({ lineId: "D", gstRatePercent: 3, unitPricePaise: 777777, quantity: 1, hsnOrSac: "7108" }),
      ],
    });
    const sumTax = c.lines.reduce((s, l) => s + l.totalTaxPaise, 0);
    const sumTaxable = c.lines.reduce((s, l) => s + l.taxableValuePaise, 0);
    expect(sumTax).toBe(c.totalTaxPaise);
    expect(sumTaxable).toBe(c.totalTaxableValuePaise);
    expect(c.grandTotalBeforeRoundingPaise).toBe(sumTaxable + sumTax);
    // Spot-check the independent rounding.
    expect(c.lines[0].igstPaise).toBe(Math.floor((333333 * 0.25) / 100 + 0.5));
    expect(c.lines[1].igstPaise).toBe(Math.floor((777777 * 3) / 100 + 0.5));
  });

  it("(c) discount == line value (taxable 0) allowed; discount > line value rejected", () => {
    const ok = computeGst({
      placeOfSupplyStateCode: "27",
      lines: [line({ unitPricePaise: 100, quantity: 1, discountPaise: 100, gstRatePercent: 18 })],
    });
    expect(ok.lines[0].taxableValuePaise).toBe(0);
    expect(ok.lines[0].totalTaxPaise).toBe(0);
    expect(() =>
      computeGst({
        placeOfSupplyStateCode: "27",
        lines: [line({ unitPricePaise: 100, quantity: 1, discountPaise: 101 })],
      }),
    ).toThrow(GstValidationError);
  });

  it("(d) hsnSummary: 3 lines, 2 sharing HSN+rate → 2 rows; taxable sums to total", () => {
    const c = computeGst({
      placeOfSupplyStateCode: "29",
      lines: [
        line({ lineId: "A", hsnOrSac: "9503", gstRatePercent: 18, unitPricePaise: 100000 }),
        line({ lineId: "B", hsnOrSac: "9503", gstRatePercent: 18, unitPricePaise: 250000 }),
        line({ lineId: "C", hsnOrSac: "4820", gstRatePercent: 12, unitPricePaise: 50000 }),
      ],
    });
    expect(c.hsnSummary).toHaveLength(2);
    const merged = c.hsnSummary.find((h) => h.hsnOrSac === "9503" && h.gstRatePercent === 18)!;
    expect(merged.taxableValuePaise).toBe(350000);
    const sumRows = c.hsnSummary.reduce((s, h) => s + h.taxableValuePaise, 0);
    expect(sumRows).toBe(c.totalTaxableValuePaise);
  });

  it("(e) rateSummary across multiple slabs reconciles taxable + tax to totals", () => {
    const c = computeGst({
      placeOfSupplyStateCode: "29",
      lines: [
        line({ lineId: "A", gstRatePercent: 5, unitPricePaise: 100000 }),
        line({ lineId: "B", gstRatePercent: 12, unitPricePaise: 100000 }),
        line({ lineId: "C", gstRatePercent: 18, unitPricePaise: 100000 }),
        line({ lineId: "D", gstRatePercent: 5, unitPricePaise: 40000 }),
      ],
    });
    const sumTaxable = c.rateSummary.reduce((s, r) => s + r.taxableValuePaise, 0);
    const sumTax = c.rateSummary.reduce((s, r) => s + r.totalTaxPaise, 0);
    expect(sumTaxable).toBe(c.totalTaxableValuePaise);
    expect(sumTax).toBe(c.totalTaxPaise);
    expect(c.rateSummary.find((r) => r.gstRatePercent === 5)!.taxableValuePaise).toBe(140000);
  });

  it("(f) 500 lines near ₹1 crore: sum of line totals === computed total exactly (no precision loss)", () => {
    const lines: GstLineInput[] = [];
    for (let i = 0; i < 500; i += 1) {
      lines.push(line({ lineId: `L${i}`, unitPricePaise: 199999, quantity: 1, gstRatePercent: 18 }));
    }
    const c = computeGst({ placeOfSupplyStateCode: "29", lines });
    const sumLineTotals = c.lines.reduce((s, l) => s + l.lineTotalPaise, 0);
    expect(sumLineTotals).toBe(c.grandTotalBeforeRoundingPaise);
    // 500 * 199999 taxable ≈ ₹10 lakh taxable + tax → still well within Number.MAX_SAFE_INTEGER.
    expect(Number.isSafeInteger(c.grandTotalBeforeRoundingPaise)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Negative-total limitation (Task 3): half-up rounding is only correct for
// grandTotalBeforeRoundingPaise >= 0; negative totals must FAIL LOUD.
// ---------------------------------------------------------------------------

describe("roundGrandTotalToRupee — non-negative only (Credit Notes must revisit)", () => {
  it("throws a typed GstValidationError on ANY negative total", () => {
    for (const neg of [-1, -50, -51, -150, -199950]) {
      expect(() => roundGrandTotalToRupee(neg)).toThrow(GstValidationError);
    }
    // The specific code is exposed for callers to branch on.
    try {
      roundGrandTotalToRupee(-50);
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(GstValidationError);
      expect((e as GstValidationError).code).toBe("negative_grand_total");
    }
  });

  it("rejects non-integer / non-finite totals", () => {
    expect(() => roundGrandTotalToRupee(100.5)).toThrow(GstValidationError);
    expect(() => roundGrandTotalToRupee(Number.NaN)).toThrow(GstValidationError);
    expect(() => roundGrandTotalToRupee(Number.POSITIVE_INFINITY)).toThrow(GstValidationError);
  });

  it("for non-negative totals rounds half-up (ties up): 0, 49-down, 50-up", () => {
    expect(roundGrandTotalToRupee(0)).toEqual({ grandTotalPaise: 0, roundOffPaise: 0 });
    expect(roundGrandTotalToRupee(200000)).toEqual({ grandTotalPaise: 200000, roundOffPaise: 0 });
    expect(roundGrandTotalToRupee(199949)).toEqual({ grandTotalPaise: 199900, roundOffPaise: -49 });
    expect(roundGrandTotalToRupee(199950)).toEqual({ grandTotalPaise: 200000, roundOffPaise: 50 });
  });

  it("property: every non-negative total yields a multiple of 100 and roundOff ∈ [-49, +50]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100_000_000_00 }), (total) => {
        const { grandTotalPaise, roundOffPaise } = roundGrandTotalToRupee(total);
        expect(grandTotalPaise % 100).toBe(0);
        expect(roundOffPaise).toBeGreaterThanOrEqual(-49);
        expect(roundOffPaise).toBeLessThanOrEqual(50);
        expect(grandTotalPaise).toBe(total + roundOffPaise);
      }),
      { numRuns: 500 },
    );
  });

  it("guarantee: computeGst never produces a negative pre-rounding total on valid inputs", () => {
    // Documents WHY the negative-total guard is currently unreachable via the public API: per-line
    // validation caps discount at the line value, so taxable and tax are always >= 0. The guard in
    // roundGrandTotalToRupee is therefore purely defensive for future Credit Note construction.
    fc.assert(
      fc.property(fc.array(lineArb, { minLength: 1, maxLength: 8 }), fc.constantFrom(...VALID_CODES), (lines, pos) => {
        const c = computeGst({ placeOfSupplyStateCode: pos, lines });
        expect(c.grandTotalBeforeRoundingPaise).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 300 },
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
