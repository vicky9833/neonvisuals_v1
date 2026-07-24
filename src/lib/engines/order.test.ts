import { describe, it, expect, vi } from "vitest";

// order.ts -> quote.ts -> pricing.ts -> @/lib/supabase/admin (server-only). Stub the server-only
// chain and stub the request-scoped client used by convertQuoteToOrder's userDb().
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

const h = vi.hoisted(() => ({ quote: null as Record<string, unknown> | null }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: table === "quotes" ? h.quote : null, error: null }) }),
        ilike: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
    }),
  }),
}));

import { convertQuoteToOrder } from "./order";
import { QuoteValidationError } from "./quote";

describe("convertQuoteToOrder: Task 1 custom-line block (interim)", () => {
  it("rejects a quote containing a custom line with a clear typed error", async () => {
    h.quote = {
      id: "q-custom",
      client_company: "Acme",
      products: [
        { sku: "NV-A-001", quantity: 10 },
        { sku: "CUSTOM-1", source: "custom", name: "Bespoke box", unitPrice: 2500, quantity: 3 },
      ],
    };
    await expect(convertQuoteToOrder("q-custom")).rejects.toBeInstanceOf(QuoteValidationError);
    try {
      await convertQuoteToOrder("q-custom");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(QuoteValidationError);
      expect((e as QuoteValidationError).code).toBe("custom_not_supported");
      expect((e as QuoteValidationError).message).toMatch(/custom line items/i);
    }
  });

  it("rejects a quote containing a charge line too", async () => {
    h.quote = {
      id: "q-charge",
      client_company: "Acme",
      products: [{ sku: "CHARGE-1", source: "charge", name: "Freight", unitPrice: 900, quantity: 1 }],
    };
    await expect(convertQuoteToOrder("q-charge")).rejects.toMatchObject({ code: "custom_not_supported" });
  });

  it("does NOT block a catalogue-only quote (guard passes; fails later at company resolution instead)", async () => {
    h.quote = {
      id: "q-cat",
      client_company: "Acme",
      products: [
        { sku: "NV-A-001", quantity: 10 },
        { sku: "NV-A-003", quantity: 5 },
      ],
    };
    // No companyId + companies lookup returns null -> throws the company-resolution error,
    // which proves the custom-line guard did NOT fire for a catalogue-only quote.
    await expect(convertQuoteToOrder("q-cat")).rejects.toThrow(/Could not resolve a company/);
  });
});
