/**
 * HANDLER-LEVEL authorization test (Prompt 2, Stage B write-wiring proof).
 *
 * Invokes the ACTUAL exported route handlers for the tenant money-write
 * entrypoints with a tenant `viewer` principal and asserts each returns 403 and
 * performs NO DB write. This exercises the real gate on the request path
 * (requirePlatform → authorize()), not authorize() in isolation.
 *
 * Migration 020 made money-table write RLS tenant-isolation-only, so the
 * app-layer gate is the SOLE role gate — this test proves it fires before any
 * engine write function is reached.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mocks (referenced inside vi.mock factories).
const m = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  writeAudit: vi.fn(),
  createClient: vi.fn(async () => ({})),
  // engine write fns we assert are NEVER called
  createQuote: vi.fn(),
  listQuotes: vi.fn(),
  createOrder: vi.fn(),
  listOrders: vi.fn(),
  toClientOrder: vi.fn(),
  convertQuoteToOrder: vi.fn(),
  createInvoice: vi.fn(),
  listInvoices: vi.fn(),
  toClientInvoice: vi.fn(),
  recordPayment: vi.fn(),
  getInvoice: vi.fn(),
  getPayments: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: m.createClient }));
vi.mock("@/lib/authz/audit", () => ({ writeAudit: m.writeAudit }));
vi.mock("@/lib/authz/context", () => ({ getAuthContext: m.getAuthContext }));
vi.mock("@/lib/engines/quote", () => ({ createQuote: m.createQuote, listQuotes: m.listQuotes }));
vi.mock("@/lib/engines/order", () => ({
  createOrder: m.createOrder,
  listOrders: m.listOrders,
  toClientOrder: m.toClientOrder,
  convertQuoteToOrder: m.convertQuoteToOrder,
}));
vi.mock("@/lib/engines/billing", () => ({
  createInvoice: m.createInvoice,
  listInvoices: m.listInvoices,
  toClientInvoice: m.toClientInvoice,
  recordPayment: m.recordPayment,
  getInvoice: m.getInvoice,
  getPayments: m.getPayments,
}));

// Real api-auth (requirePlatform/requireTenant) runs against the mocked context.
import { POST as quotesPOST } from "@/app/api/quotes/route";
import { POST as ordersPOST } from "@/app/api/orders/route";
import { POST as ordersFromQuotePOST } from "@/app/api/orders/from-quote/route";
import { POST as invoicesPOST } from "@/app/api/invoices/route";

/** A tenant VIEWER: one active membership, NOT platform staff. */
const viewerCtx = {
  userId: "00000000-0000-0000-0000-0000000000aa",
  email: "viewer@example.com",
  isPlatformStaff: false,
  platformRole: null,
  memberships: [
    { companyId: "11111111-1111-1111-1111-111111111111", role: "viewer", departmentId: null, approvalLimit: null },
  ],
  activeCompanyId: "11111111-1111-1111-1111-111111111111",
};

function jsonReq(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  m.getAuthContext.mockResolvedValue(viewerCtx);
});

describe("Tenant viewer money-WRITE → 403 from the route gate, no DB write", () => {
  it("POST /api/quotes (quote create) → 403, createQuote NOT called", async () => {
    const res = await quotesPOST(
      jsonReq("http://localhost/api/quotes", {
        clientName: "X", clientCompany: "Y", clientEmail: "a@b.com", clientPhone: "1",
        occasion: "Diwali", products: [{ sku: "NV-A-001", quantity: 1 }],
        packagingTier: "standard", personalisation: "name_occasion", kitCount: 1,
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("forbidden");
    expect(m.createQuote).not.toHaveBeenCalled();
  });

  it("POST /api/orders (order create) → 403, createOrder NOT called", async () => {
    const res = await ordersPOST(
      jsonReq("http://localhost/api/orders", {
        companyId: "11111111-1111-1111-1111-111111111111",
        products: [{ sku: "NV-A-001", quantity: 1 }],
        packagingTier: "standard", personalisationLevel: "name_occasion", kitCount: 1,
      }),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("forbidden");
    expect(m.createOrder).not.toHaveBeenCalled();
  });

  it("POST /api/orders/from-quote (order mutate) → 403, convertQuoteToOrder NOT called", async () => {
    const res = await ordersFromQuotePOST(
      jsonReq("http://localhost/api/orders/from-quote", {
        quoteId: "22222222-2222-2222-2222-222222222222",
      }),
    );
    expect(res.status).toBe(403);
    expect(m.convertQuoteToOrder).not.toHaveBeenCalled();
  });

  it("POST /api/invoices (invoice/billing write) → 403, createInvoice NOT called", async () => {
    const res = await invoicesPOST(
      jsonReq("http://localhost/api/invoices", {
        orderId: "33333333-3333-3333-3333-333333333333",
        invoiceType: "advance", paymentPercentage: 50, dueDate: "2026-12-31",
      }),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("forbidden");
    expect(m.createInvoice).not.toHaveBeenCalled();
  });

  it("no audit row is written for a denied tenant viewer (403 before audit)", () => {
    expect(m.writeAudit).not.toHaveBeenCalled();
  });
});
