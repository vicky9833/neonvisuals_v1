import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// billing.ts pulls in @/lib/services/email which begins with `import "server-only"`.
// That package is not resolvable under the node test runner, so stub it to empty — the
// same pattern used by src/app/api/money-write-authz.test.ts. We exercise the REAL
// billing functions (resolveSupplyDecision / calculateGST*), so billing.ts is NOT mocked.
vi.mock("server-only", () => ({}));

import {
  resolveSupplyDecision,
  calculateGST,
  calculateGSTInclusive,
} from "./billing";
import { validateGstin } from "@/lib/gst";

// ---------------------------------------------------------------------------
// Helpers: build genuinely-valid GSTINs (real mod-36 checksum) for a state code,
// so the "valid GSTIN wins" path is exercised, not a prefix hack.
// ---------------------------------------------------------------------------
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** A valid 15-char GSTIN for `stateCode` (PAN block fixed; correct check digit computed). */
function validGstinForState(stateCode: string): string {
  const base14 = `${stateCode}ABCDE1234F1Z`; // 2 + PAN(ABCDE1234F) + entity(1) + Z = 14 chars
  for (const ch of ALPHABET) {
    const candidate = base14 + ch;
    if (validateGstin(candidate).ok) return candidate;
  }
  throw new Error(`could not build a valid GSTIN for state ${stateCode}`);
}

const KA_GSTIN = validGstinForState("29"); // Karnataka
const MH_GSTIN = validGstinForState("27"); // Maharashtra (== seller state)

// An INVALID GSTIN that nonetheless starts with "29": mutate a valid KA one's checksum so it fails.
const KA_GSTIN_INVALID = (() => {
  const wrongLast = KA_GSTIN.slice(-1) === "A" ? "B" : "A";
  const candidate = KA_GSTIN.slice(0, 14) + wrongLast;
  // Guarantee it is actually invalid (in the vanishingly unlikely case the swap is still valid).
  return validateGstin(candidate).ok ? KA_GSTIN.slice(0, 14) + "0" : candidate;
})();

// ---------------------------------------------------------------------------
// AMOUNT-INVARIANCE (the critical proof): flipping the supply type changes ONLY
// the CGST/SGST vs IGST split. Taxable value, TOTAL tax, and grand total are
// byte-identical. Expected pre-hotfix amounts are HARDCODED so a future refactor
// cannot silently drift them.
// ---------------------------------------------------------------------------
describe("AMOUNT-INVARIANCE: tax head may change, amounts may NOT", () => {
  it("GST-INCLUSIVE Rs 1,999 @18%: base/totalGst/grandTotal identical intra vs inter", () => {
    const intra = calculateGSTInclusive(1999, true);
    const inter = calculateGSTInclusive(1999, false);

    // Hardcoded pre-hotfix expected amounts.
    expect(intra.base).toBe(1694.07);
    expect(intra.totalGst).toBe(304.93);
    expect(intra.grandTotal).toBe(1999.0);

    // Amounts are invariant across the supply-type flip.
    expect(inter.base).toBe(intra.base);
    expect(inter.totalGst).toBe(intra.totalGst);
    expect(inter.grandTotal).toBe(intra.grandTotal);

    // Only the split differs.
    expect(intra.cgst).toBe(152.47);
    expect(intra.sgst).toBe(152.46);
    expect(intra.igst).toBe(0);
    expect(intra.cgst + intra.sgst).toBe(intra.totalGst);

    expect(inter.igst).toBe(304.93);
    expect(inter.cgst).toBe(0);
    expect(inter.sgst).toBe(0);
    expect(inter.igst).toBe(inter.totalGst);
  });

  it("GST-INCLUSIVE Rs 999 and Rs 4,999 @18%: amounts invariant", () => {
    const a1 = calculateGSTInclusive(999, true);
    const a2 = calculateGSTInclusive(999, false);
    expect(a1.base).toBe(846.61);
    expect(a1.totalGst).toBe(152.39);
    expect(a1.grandTotal).toBe(999.0);
    expect([a2.base, a2.totalGst, a2.grandTotal]).toEqual([a1.base, a1.totalGst, a1.grandTotal]);

    const b1 = calculateGSTInclusive(4999, true);
    const b2 = calculateGSTInclusive(4999, false);
    expect(b1.base).toBe(4236.44);
    expect(b1.totalGst).toBe(762.56);
    expect(b1.grandTotal).toBe(4999.0);
    expect([b2.base, b2.totalGst, b2.grandTotal]).toEqual([b1.base, b1.totalGst, b1.grandTotal]);
  });

  it("ADDITIVE Rs 100000 @18%: totalGst/grandTotal identical intra vs inter", () => {
    const intra = calculateGST(100000, true);
    const inter = calculateGST(100000, false);

    expect(intra.totalGst).toBe(18000);
    expect(intra.grandTotal).toBe(118000);
    expect(inter.totalGst).toBe(intra.totalGst);
    expect(inter.grandTotal).toBe(intra.grandTotal);

    expect(intra.cgst).toBe(9000);
    expect(intra.sgst).toBe(9000);
    expect(intra.igst).toBe(0);
    expect(inter.igst).toBe(18000);
    expect(inter.cgst).toBe(0);
    expect(inter.sgst).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// CORRECTNESS of the supply-type decision (seller is Maharashtra, code 27).
// ---------------------------------------------------------------------------
describe("resolveSupplyDecision correctness", () => {
  it("[1] Karnataka buyer GSTIN (29) -> INTER_STATE -> IGST only (OLD CODE GOT THIS WRONG)", () => {
    const d = resolveSupplyDecision(KA_GSTIN, null);
    expect(d.supplyType).toBe("INTER_STATE");
    expect(d.basis).toBe("buyer_gstin");
    expect(d.buyerStateCode).toBe("29");
    // The tax head the law requires: IGST only.
    const gst = calculateGSTInclusive(1999, d.supplyType === "INTRA_STATE");
    expect(gst.igst).toBeGreaterThan(0);
    expect(gst.cgst).toBe(0);
    expect(gst.sgst).toBe(0);
  });

  it("[2] Maharashtra buyer GSTIN (27) -> INTRA_STATE -> CGST+SGST, IGST 0 (ALSO PREVIOUSLY WRONG)", () => {
    const d = resolveSupplyDecision(MH_GSTIN, null);
    expect(d.supplyType).toBe("INTRA_STATE");
    expect(d.basis).toBe("buyer_gstin");
    expect(d.buyerStateCode).toBe("27");
    const gst = calculateGSTInclusive(1999, d.supplyType === "INTRA_STATE");
    expect(gst.igst).toBe(0);
    expect(gst.cgst).toBeGreaterThan(0);
    expect(gst.sgst).toBeGreaterThan(0);
  });

  it("[3] No GSTIN, city 'Bengaluru' -> INTER_STATE via city lookup", () => {
    const d = resolveSupplyDecision(null, "Bengaluru");
    expect(d.supplyType).toBe("INTER_STATE");
    expect(d.basis).toBe("city_lookup");
    expect(d.buyerStateCode).toBe("29");
    expect(d.confidence).toBe("low");
  });

  it("[4] No GSTIN, city 'Mumbai' -> INTRA_STATE via city lookup", () => {
    const d = resolveSupplyDecision(null, "Mumbai");
    expect(d.supplyType).toBe("INTRA_STATE");
    expect(d.basis).toBe("city_lookup");
    expect(d.buyerStateCode).toBe("27");
  });

  it("[5] No GSTIN, city 'Atlantis' -> INTER_STATE fallback + flagged (basis unknown)", () => {
    const d = resolveSupplyDecision(null, "Atlantis");
    expect(d.supplyType).toBe("INTER_STATE");
    expect(d.basis).toBe("unknown");
    expect(d.buyerStateCode).toBeNull();
  });

  it("[6] INVALID GSTIN (starts 29) + valid city 'Mumbai' -> city lookup wins, NOT 29", () => {
    expect(validateGstin(KA_GSTIN_INVALID).ok).toBe(false); // precondition: it really is invalid
    expect(KA_GSTIN_INVALID.slice(0, 2)).toBe("29"); // and it really does start with 29
    const d = resolveSupplyDecision(KA_GSTIN_INVALID, "Mumbai");
    expect(d.basis).toBe("city_lookup");
    expect(d.buyerStateCode).toBe("27"); // Mumbai, NOT the invalid GSTIN's "29" prefix
    expect(d.supplyType).toBe("INTRA_STATE");
  });

  it("[7] Rs 1,999 inclusive, Karnataka buyer -> IGST 18% broken out of the inclusive total", () => {
    const d = resolveSupplyDecision(KA_GSTIN, null);
    expect(d.supplyType).toBe("INTER_STATE");
    const gst = calculateGSTInclusive(1999, false);
    // Exact expected taxable value and tax (hardcoded).
    expect(gst.base).toBe(1694.07); // taxable value
    expect(gst.igst).toBe(304.93); // full IGST
    expect(gst.totalGst).toBe(304.93);
    expect(gst.cgst).toBe(0);
    expect(gst.sgst).toBe(0);
    expect(gst.grandTotal).toBe(1999.0);
  });
});

// ---------------------------------------------------------------------------
// [8] No state-code literal remains in billing.ts.
// ---------------------------------------------------------------------------
describe("billing.ts contains no state-code literal", () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "billing.ts"), "utf8");

  it("the string \"29\" does not appear as a literal", () => {
    expect(src.includes('"29"')).toBe(false);
    expect(src.includes("'29'")).toBe(false);
  });

  it("the word 'Karnataka' does not appear", () => {
    expect(/karnataka/i.test(src)).toBe(false);
  });

  it("the old city allow-list tokens are gone", () => {
    for (const token of ["bengaluru", "bangalore", "mysore", "hubli", "belgaum"]) {
      expect(src.toLowerCase().includes(`"${token}"`)).toBe(false);
    }
  });
});
