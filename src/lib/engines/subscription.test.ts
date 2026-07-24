import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// subscription.ts is `server-only` and pulls in razorpay / billing / invoice-pdf / notifications /
// email. Stub the ones we are not exercising so the module loads under the node test runner; keep
// @/lib/gst REAL (pure) so the price derivation runs the actual Section-170 rounding.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/services/razorpay", () => ({ createOrder: vi.fn() }));
vi.mock("@/lib/engines/invoice-pdf", () => ({ saveInvoicePDF: vi.fn(async () => "quote-pdfs/x.pdf") }));
vi.mock("@/lib/engines/notifications", () => ({ notifyPaymentReceived: vi.fn(async () => {}) }));

const h = vi.hoisted(() => ({
  createSubscriptionInvoice: vi.fn(
    async (
      _db: unknown,
      _input: { amountRupees: number; baseAmountRupees?: number | null },
    ) => ({ id: "inv-1" }),
  ),
  sendNotificationEmail: vi.fn(async () => ({ success: true })),
}));
vi.mock("@/lib/engines/billing", () => ({ createSubscriptionInvoice: h.createSubscriptionInvoice }));
vi.mock("@/lib/services/email", () => ({ sendNotificationEmail: h.sendNotificationEmail }));

import {
  PRO_PRICE_BASE_PAISE,
  PRO_GST_RATE_PERCENT,
  PRO_PRICE_CHARGED_PAISE,
  activateSubscriptionFromWebhook,
} from "./subscription";

// ---------------------------------------------------------------------------
// TASK 2: the CHARGED amount is DERIVED (base + GST, Section-170 rounded) and equals 235900.
// ---------------------------------------------------------------------------
describe("Task 2: Pro price constants", () => {
  it("base is the advertised Rs 1,999 (199900 paise), rate 18%", () => {
    expect(PRO_PRICE_BASE_PAISE).toBe(199900);
    expect(PRO_GST_RATE_PERCENT).toBe(18);
  });

  it("derived charged amount = base + 18% GST, Section-170 rounded = 235900 paise (Rs 2,359.00)", () => {
    // 199900 + 35982 = 235882 -> half-up to the rupee -> 235900 (round-off +18 paise).
    expect(PRO_PRICE_CHARGED_PAISE).toBe(235900);
  });
});

// ---------------------------------------------------------------------------
// TASK 4: webhook amount verification. Chainable fake admin client for
// activateSubscriptionFromWebhook (createSubscriptionInvoice is mocked, so no
// invoices/companies calls are made from the engine).
// ---------------------------------------------------------------------------
interface AuditRow {
  action?: string;
  actor_type?: string;
  actor_user_id?: string | null;
  entity?: string;
  entity_id?: string;
  after?: Record<string, unknown>;
}

function fakeAdmin(sub: Record<string, unknown>) {
  const audits: AuditRow[] = [];
  function builder(table: string) {
    const state = { op: "select" as "select" | "update" | "insert", cols: "" };
    const chain: Record<string, unknown> = {
      select(cols: string) {
        if (state.op !== "update") state.op = "select";
        state.cols = cols ?? "";
        return chain;
      },
      insert(row: AuditRow) {
        if (table === "audit_log") audits.push(row);
        state.op = "insert";
        return chain;
      },
      update() {
        state.op = "update";
        return chain;
      },
      eq() {
        return chain;
      },
      neq() {
        return chain;
      },
      order() {
        return chain;
      },
      limit() {
        return chain;
      },
      async maybeSingle() {
        if (table === "subscriptions") {
          if (state.op === "update") return { data: { id: sub.id }, error: null }; // claim wins
          if (state.cols.includes("current_period_end")) return { data: null }; // no prior active
          return { data: sub }; // initial lookup
        }
        return { data: null };
      },
      async single() {
        return { data: null, error: null };
      },
    };
    return chain;
  }
  const client = {
    from: (t: string) => builder(t),
    rpc: async () => ({ error: null }),
  } as unknown as SupabaseClient;
  return { client, audits };
}

const SUB = {
  id: "sub-1",
  company_id: "co-1",
  status: "created",
  amount: 235900, // expected charged (base + GST)
  base_amount: 199900, // pre-tax base
};

describe("Task 4: webhook amount verification", () => {
  beforeEach(() => {
    h.createSubscriptionInvoice.mockClear();
    h.sendNotificationEmail.mockClear();
  });

  it("matching captured amount: activates, invoices captured==expected, NO flag", async () => {
    const { client, audits } = fakeAdmin({ ...SUB });
    const res = await activateSubscriptionFromWebhook(client, {
      razorpayOrderId: "order_match",
      razorpayPaymentId: "pay_match",
      capturedAmountPaise: 235900,
    });
    expect(res.activated).toBe(true);
    // Invoice uses the captured amount (== expected here) in RUPEES, with the base passed through.
    expect(h.createSubscriptionInvoice).toHaveBeenCalledTimes(1);
    const arg = h.createSubscriptionInvoice.mock.calls[0][1];
    expect(arg.amountRupees).toBe(2359);
    expect(arg.baseAmountRupees).toBe(1999);
    // No mismatch: no audit row, no alert email.
    expect(audits).toHaveLength(0);
    expect(h.sendNotificationEmail).not.toHaveBeenCalled();
  });

  it("mismatched captured amount: STILL activates, invoices the CAPTURED amount, audit + one email", async () => {
    const { client, audits } = fakeAdmin({ ...SUB });
    const res = await activateSubscriptionFromWebhook(client, {
      razorpayOrderId: "order_mismatch",
      razorpayPaymentId: "pay_mismatch",
      capturedAmountPaise: 200000, // Rs 2,000 — differs from expected Rs 2,359
    });
    // Activation is NOT blocked by the mismatch.
    expect(res.activated).toBe(true);
    // Invoice reflects the amount ACTUALLY CAPTURED, never the expected.
    const arg = h.createSubscriptionInvoice.mock.calls[0][1];
    expect(arg.amountRupees).toBe(2000);
    // Flagged loudly: exactly one audit row + one alert email.
    expect(audits).toHaveLength(1);
    expect(audits[0].action).toBe("subscription.amount_mismatch");
    expect(audits[0].actor_type).toBe("system");
    expect(audits[0].actor_user_id).toBeNull();
    expect(audits[0].entity).toBe("subscription");
    expect(audits[0].after?.expected_paise).toBe(235900);
    expect(audits[0].after?.captured_paise).toBe(200000);
    expect(h.sendNotificationEmail).toHaveBeenCalledTimes(1);
  });

  it("no captured amount on the payload: activates and invoices the EXPECTED amount, no flag", async () => {
    const { client, audits } = fakeAdmin({ ...SUB });
    const res = await activateSubscriptionFromWebhook(client, {
      razorpayOrderId: "order_noamt",
      razorpayPaymentId: "pay_noamt",
      // capturedAmountPaise omitted
    });
    expect(res.activated).toBe(true);
    const arg = h.createSubscriptionInvoice.mock.calls[0][1];
    expect(arg.amountRupees).toBe(2359); // expected amount
    expect(audits).toHaveLength(0);
    expect(h.sendNotificationEmail).not.toHaveBeenCalled();
  });
});
