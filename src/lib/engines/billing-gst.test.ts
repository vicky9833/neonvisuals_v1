import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// billing.ts pulls in @/lib/services/email which begins with `import "server-only"`.
// That package is not resolvable under the node test runner, so stub it to empty — the
// same pattern used by src/app/api/money-write-authz.test.ts. We exercise the REAL
// billing functions (resolveSupplyDecision / calculateGST* / flagPlaceOfSupply), so
// billing.ts itself is NOT mocked.
vi.mock("server-only", () => ({}));

// Spy on the email service so the flag tests can assert email is sent for "unknown" only.
const h = vi.hoisted(() => ({
  sendNotificationEmail: vi.fn(async () => ({ success: true })),
  sendPaymentConfirmationEmail: vi.fn(async () => ({ success: true })),
}));
vi.mock("@/lib/services/email", () => ({
  sendNotificationEmail: h.sendNotificationEmail,
  sendPaymentConfirmationEmail: h.sendPaymentConfirmationEmail,
}));

import {
  resolveSupplyDecision,
  calculateGST,
  calculateGSTInclusive,
  flagPlaceOfSupply,
  createSubscriptionInvoice,
} from "./billing";
import { validateGstin, getDefaultRegistration, formatRegisteredAddress } from "@/lib/gst";

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

// ---------------------------------------------------------------------------
// TASK A: seller identity sourced from the registration config (Rule 46).
// ---------------------------------------------------------------------------
describe("Task A: seller identity from config", () => {
  const reg = getDefaultRegistration();
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "billing.ts"), "utf8");

  it("formatRegisteredAddress contains the full Rule 46 address parts", () => {
    const addr = formatRegisteredAddress(reg);
    for (const part of [
      "Room No 20",
      "Jogeshwari Vikhroli Link Road",
      "Andheri East",
      "Mumbai",
      "Maharashtra",
      "400093",
    ]) {
      expect(addr, `address must contain "${part}"`).toContain(part);
    }
    expect(addr.endsWith("India")).toBe(true);
    // Exactly the migration 058 default string (single source of truth).
    expect(addr).toBe(
      "Room No 20, Vishwakarma Rahiwashi Sangh, Jogeshwari Vikhroli Link Road, Near SEEPZ Quarters, Andheri East, Mumbai, Maharashtra 400093, India",
    );
  });

  it("seller_gstin is sourced from config and equals 27BZSPV5411Q1ZA", () => {
    expect(reg.gstin).toBe("27BZSPV5411Q1ZA");
    expect(reg.pan).toBe("BZSPV5411Q");
  });

  it("no hardcoded seller address / GSTIN string literal remains in billing.ts", () => {
    expect(src.includes("Mumbai, Maharashtra, India")).toBe(false);
    expect(src.includes("27BZSPV5411Q1ZA")).toBe(false);
    // The duplicate constant is removed.
    expect(/\bSELLER_GSTIN\b/.test(src)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TASK C: low-confidence flag routing (inferred vs unresolved).
// ---------------------------------------------------------------------------
describe("Task C: flag routing for low-confidence place of supply", () => {
  interface CapturedInsert {
    table: string;
    row: Record<string, unknown>;
  }
  function fakeServiceRoleDb() {
    const inserts: CapturedInsert[] = [];
    const client = {
      from: (table: string) => ({
        insert: (row: Record<string, unknown>) => {
          inserts.push({ table, row });
          return Promise.resolve({ error: null });
        },
      }),
    } as unknown as SupabaseClient;
    return { inserts, client };
  }

  beforeEach(() => {
    h.sendNotificationEmail.mockClear();
  });

  it("both city_lookup and unknown are confidence 'low' (both get flagged)", () => {
    expect(resolveSupplyDecision(null, "Bengaluru").confidence).toBe("low");
    expect(resolveSupplyDecision(null, "Bengaluru").basis).toBe("city_lookup");
    expect(resolveSupplyDecision(null, "Atlantis").confidence).toBe("low");
    expect(resolveSupplyDecision(null, "Atlantis").basis).toBe("unknown");
  });

  it("[unknown] service-role audit 'unresolved' (actor null) + email sent", async () => {
    const db = fakeServiceRoleDb();
    await flagPlaceOfSupply({
      db: db.client,
      invoiceId: "inv-unknown",
      companyId: "co-1",
      rawCity: "Atlantis",
      basis: "unknown",
    });
    expect(db.inserts).toHaveLength(1);
    expect(db.inserts[0].table).toBe("audit_log");
    expect(db.inserts[0].row.action).toBe("invoice.place_of_supply_unresolved");
    expect(db.inserts[0].row.actor_user_id).toBeNull();
    expect(db.inserts[0].row.actor_type).toBe("system");
    expect(db.inserts[0].row.entity_id).toBe("inv-unknown");
    expect((db.inserts[0].row.after as Record<string, unknown>).fallback).toBe("IGST");
    expect(h.sendNotificationEmail).toHaveBeenCalledTimes(1);
  });

  it("[city_lookup] service-role audit 'inferred' + NO email", async () => {
    const db = fakeServiceRoleDb();
    await flagPlaceOfSupply({
      db: db.client,
      invoiceId: "inv-inferred",
      companyId: "co-1",
      rawCity: "Bengaluru",
      buyerStateCode: "29",
      basis: "city_lookup",
    });
    expect(db.inserts).toHaveLength(1);
    expect(db.inserts[0].row.action).toBe("invoice.place_of_supply_inferred");
    expect((db.inserts[0].row.after as Record<string, unknown>).inferredStateCode).toBe("29");
    expect(h.sendNotificationEmail).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// PHASE 6: subscription invoice — Route B (additive GST on the base) + Section-170
// round-off shown as its own value. Reconciliation MUST hold on the page:
// subtotal + tax + round_off == grand_total, and grand_total == the amount charged.
// ---------------------------------------------------------------------------
describe("Phase 6: subscription invoice — additive-from-base + round-off", () => {
  function fakeInvoiceDb(company: Record<string, unknown>) {
    const captured: { payload?: Record<string, number | string | boolean | null> } = {};
    const client = {
      from(table: string) {
        if (table === "invoices") {
          return {
            // Idempotency pre-check: no existing invoice for this subscription.
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
            insert: (payload: Record<string, number | string | boolean | null>) => {
              captured.payload = payload;
              return {
                select: () => ({
                  single: async () => ({
                    data: {
                      ...payload,
                      id: "inv-1",
                      invoice_number: "NV-INV-2026-0001",
                      orders: null,
                      created_at: "t",
                      updated_at: "t",
                    },
                    error: null,
                  }),
                }),
              };
            },
          };
        }
        if (table === "companies") {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: company }) }) }) };
        }
        return { insert: async () => ({ error: null }) };
      },
    } as unknown as SupabaseClient;
    return { client, captured };
  }

  const baseCompany = {
    name: "Acme Pvt Ltd",
    city: null,
    primary_contact_name: "Priya",
    primary_contact_email: "priya@acme.test",
    primary_contact_phone: null,
    address: "1 Test Road",
  };

  it("Maharashtra buyer (intra-state): CGST 179.91 + SGST 179.91, round-off 0.18, grand 2359", async () => {
    const { client, captured } = fakeInvoiceDb({ ...baseCompany, gstin: MH_GSTIN });
    const inv = await createSubscriptionInvoice(client, {
      subscriptionId: "sub-mh",
      companyId: "co-mh",
      amountRupees: 2359, // charged all-in
      baseAmountRupees: 1999, // pre-tax base snapshot
    });
    expect(inv).not.toBeNull();
    const p = captured.payload!;
    expect(p.is_intra_state).toBe(true);
    expect(p.subtotal).toBe(1999); // taxable value
    expect(p.cgst_amount).toBe(179.91);
    expect(p.sgst_amount).toBe(179.91);
    expect(p.igst_amount).toBe(0);
    expect(p.total_gst).toBe(359.82);
    expect(p.round_off).toBe(0.18);
    expect(p.grand_total).toBe(2359);
    // Reconciliation on the page: taxable + tax + round-off == grand total.
    expect(Number(((p.subtotal as number) + (p.total_gst as number) + (p.round_off as number)).toFixed(2))).toBe(2359);
    // Charged (2359) == invoice grand total.
    expect(p.grand_total).toBe(2359);
    expect(inv!.round_off).toBe(0.18);
  });

  it("Karnataka buyer (inter-state): IGST 359.82, round-off 0.18, grand 2359", async () => {
    const { client, captured } = fakeInvoiceDb({ ...baseCompany, gstin: KA_GSTIN });
    const inv = await createSubscriptionInvoice(client, {
      subscriptionId: "sub-ka",
      companyId: "co-ka",
      amountRupees: 2359,
      baseAmountRupees: 1999,
    });
    const p = captured.payload!;
    expect(p.is_intra_state).toBe(false);
    expect(p.subtotal).toBe(1999);
    expect(p.igst_amount).toBe(359.82);
    expect(p.cgst_amount).toBe(0);
    expect(p.sgst_amount).toBe(0);
    expect(p.total_gst).toBe(359.82);
    expect(p.round_off).toBe(0.18);
    expect(p.grand_total).toBe(2359);
    expect(Number(((p.subtotal as number) + (p.total_gst as number) + (p.round_off as number)).toFixed(2))).toBe(2359);
  });

  it("legacy row (no base snapshot): GST-inclusive fallback, round_off NULL, grand == charged", async () => {
    const { client, captured } = fakeInvoiceDb({ ...baseCompany, gstin: KA_GSTIN });
    await createSubscriptionInvoice(client, {
      subscriptionId: "sub-legacy",
      companyId: "co-legacy",
      amountRupees: 1999, // legacy: charged treated as GST-inclusive
      // baseAmountRupees omitted (null)
    });
    const p = captured.payload!;
    expect(p.round_off).toBeNull(); // unchanged legacy behaviour
    expect(p.grand_total).toBe(1999);
    // Inclusive: base + tax reconciles to the inclusive total exactly.
    expect(Number(((p.subtotal as number) + (p.total_gst as number)).toFixed(2))).toBe(1999);
  });
});
