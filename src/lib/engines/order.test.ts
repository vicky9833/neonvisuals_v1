import { describe, it, expect, vi, beforeEach } from "vitest";

// order.ts -> pricing.ts (pure) + quote.ts; stub the server-only chain and the request-scoped
// client used by convertQuoteToOrder/createOrder/getOrder.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

const h = vi.hoisted(() => ({
  quote: null as Record<string, unknown> | null,
  captured: { orderItems: [] as Array<Record<string, unknown>> },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from(table: string) {
      if (table === "quotes") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: h.quote, error: null }) }) }),
          update: () => ({ eq: async () => ({ error: null }) }),
        };
      }
      if (table === "companies") {
        return { select: () => ({ ilike: () => ({ maybeSingle: async () => ({ data: { id: "co-1" }, error: null }) }) }) };
      }
      if (table === "orders") {
        return {
          insert: () => ({ select: () => ({ single: async () => ({ data: { id: "ord-1" }, error: null }) }) }),
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "ord-1",
                  company_id: "co-1",
                  status: "draft",
                  kit_count: 10,
                  order_items: h.captured.orderItems.map((r, i) => ({ ...r, id: `it-${i}` })),
                  order_recipients: [],
                  order_status_history: [],
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "order_items") {
        return {
          insert: async (rows: Array<Record<string, unknown>>) => {
            h.captured.orderItems = rows;
            return { error: null };
          },
        };
      }
      if (table === "order_status_history") {
        return { insert: async () => ({ error: null }) };
      }
      return {};
    },
  }),
}));

import { convertQuoteToOrder } from "./order";
import { PricingError } from "./pricing";

beforeEach(() => {
  h.captured.orderItems = [];
});

describe("convertQuoteToOrder (Phase 5B Task 2): custom/charge carry across intact", () => {
  it("a quote with catalogue + custom + charge converts with all three intact at identical amounts", async () => {
    h.quote = {
      id: "q-mixed",
      client_company: "Acme",
      occasion: "Onboarding",
      kit_count: 10,
      packaging_tier: "standard",
      personalisation_level: "name_occasion",
      rush_order: false,
      discount_percent: 0,
      products: [
        { sku: "NV-A-001", quantity: 10, unitPrice: 500, name: "Welcome Kit" },
        { sku: "CUSTOM-1", source: "custom", name: "Bespoke box", unitPrice: 2500, quantity: 3 },
        { sku: "CHARGE-1", source: "charge", name: "Freight", unitPrice: 900, quantity: 1 },
      ],
    };

    const order = await convertQuoteToOrder("q-mixed", "co-1", "user-1");
    expect(order.items).toHaveLength(3);
    const bySku = Object.fromEntries(order.items.map((i) => [i.product_sku, i]));

    expect(bySku["NV-A-001"].source).toBe("catalogue");
    expect(bySku["NV-A-001"].unit_price).toBe(500);
    expect(bySku["NV-A-001"].line_total).toBe(5000);

    expect(bySku["CUSTOM-1"].source).toBe("custom");
    expect(bySku["CUSTOM-1"].product_name).toBe("Bespoke box");
    expect(bySku["CUSTOM-1"].unit_price).toBe(2500);
    expect(bySku["CUSTOM-1"].line_total).toBe(7500);

    expect(bySku["CHARGE-1"].source).toBe("charge");
    expect(bySku["CHARGE-1"].unit_price).toBe(900);
    expect(bySku["CHARGE-1"].quantity).toBe(1);
    expect(bySku["CHARGE-1"].line_total).toBe(900);
  });

  it("fails loud (PricingError) when a line has no typed price (manual pricing)", async () => {
    h.quote = {
      id: "q-unpriced",
      client_company: "Acme",
      kit_count: 10,
      packaging_tier: "standard",
      personalisation_level: "name_occasion",
      rush_order: false,
      discount_percent: 0,
      products: [{ sku: "NV-A-001", quantity: 10 }], // no unitPrice
    };
    await expect(convertQuoteToOrder("q-unpriced", "co-1", "user-1")).rejects.toBeInstanceOf(PricingError);
  });
});
