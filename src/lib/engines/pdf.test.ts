import { describe, it, expect, vi } from "vitest";

// pdf.tsx imports @/lib/supabase/admin (server-only) and quote.ts (which imports pricing -> admin).
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

import { quotePdfLineRows, generateQuotePDF } from "./pdf";
import type { Quote } from "./quote";
import type { PricingResult } from "./pricing";

function quoteWithCustomLine(): Quote {
  const pricing: PricingResult = {
    lineItems: [
      { sku: "NV-A-001", source: "catalogue", productName: "Welcome Kit", unitPrice: 450, quantity: 25, lineTotal: 11250, cogs: 100, marginPercent: 60, priceOverridden: false },
      { sku: "CUSTOM-1", source: "custom", productName: "Bespoke Engraved Box", unitPrice: 2500, quantity: 3, lineTotal: 7500, cogs: 0, marginPercent: 0, priceOverridden: false },
      { sku: "CHARGE-1", source: "charge", productName: "Freight", unitPrice: 900, quantity: 1, lineTotal: 900, cogs: 0, marginPercent: 0, priceOverridden: false },
    ],
    subtotal: 19650,
    packagingCost: 125,
    packagingTotal: 125,
    personalisationPremium: 0,
    personalisationTotal: 0,
    resumeIntelligencePremium: 0,
    resumeIntelligenceTotal: 0,
    rushSurchargePercent: 0,
    rushSurchargeAmount: 0,
    subtotalBeforeRush: 19775,
    grandTotal: 19775,
    totalCogs: 2500,
    overallMarginPercent: 60,
    perKitInvestment: 19775,
    kitCount: 1,
  };
  return {
    id: "q1",
    quote_number: "NV-Q-2026-0001",
    status: "draft",
    created_at: new Date("2026-01-01").toISOString(),
    valid_until: "2026-01-16",
    client_name: "Priya",
    client_company: "Acme",
    client_email: "priya@acme.test",
    client_phone: "+91 90000 00000",
    occasion: "Onboarding",
    kit_count: 1,
    packaging_tier: "essential",
    personalisation_level: "name_only",
    resume_intelligence: false,
    rush_order: false,
    rush_days: null,
    timeline: null,
    sample_message: null,
    special_instructions: null,
    products: [],
    pricing,
    discount_percent: 0,
    discount_amount: 0,
    final_total: 19775,
    per_kit_investment: 19775,
    validity_days: 15,
    notes: null,
    pdf_url: null,
  };
}

describe("quotePdfLineRows: custom/charge render their name + amount (never a raw SKU at Rs 0)", () => {
  it("maps a custom line to its typed name and price", () => {
    const rows = quotePdfLineRows(quoteWithCustomLine());
    const custom = rows.find((r) => r.sku === "CUSTOM-1")!;
    expect(custom.name).toBe("Bespoke Engraved Box");
    expect(custom.name).not.toBe(custom.sku); // not a raw SKU
    expect(custom.unitPrice).toBe(2500); // not 0
    expect(custom.lineTotal).toBe(7500);

    const charge = rows.find((r) => r.sku === "CHARGE-1")!;
    expect(charge.name).toBe("Freight");
    expect(charge.unitPrice).toBe(900);
    expect(charge.quantity).toBe(1);
  });
});

describe("generateQuotePDF renders without throwing on custom/charge lines", () => {
  it("returns a non-empty PDF buffer", async () => {
    const buf = await generateQuotePDF(quoteWithCustomLine());
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });
});
