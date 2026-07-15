# Stage B — WRITE-WIRING VERIFICATION (money-table write paths)

Closes the gap between "matrix says deny" and "the gate is actually on the request path."
Because migration 020 made money-table write RLS **tenant-isolation-only** and Stage A put
engines on the user client, the app-layer gate is the SOLE role gate on money writes.

## Design reality (important)
In this product, **money writes are PLATFORM-plane operations** (Neon Visuals staff create
quotes/orders/invoices; tenants only *request* via the public lead flow and READ their own).
There is **no tenant-plane money-write route**. Every money-write entrypoint is therefore
gated by `requirePlatform(capability, …)` (or the platform-staff `requireApiRole` shim),
which runs `authorize()` on the platform plane and **denies every non-platform caller —
including a tenant `viewer` — with 403 BEFORE any engine write is called.**

`requirePlatform(cap)` internally = `requireApiAuth()` → `auditCrossTenantAccess()`:
```
if (principal.platformRole == null) throw ApiAuthError(403, "forbidden", "Platform access required.");
const decision = authorize({ plane: "platform", role }, cap);   // authorize() ON the path
if (decision.effect !== "allow") throw ApiAuthError(403, "forbidden", decision.reason);
```

## 1. Per-route gate call sites (gate is BEFORE the write in every handler)

| Money-write entrypoint | File · line | Gate (authorize via) | Engine write guarded |
|---|---|---|---|
| Quote create | `api/quotes/route.ts:33` | `await requirePlatform("platform.billing.manage", {action:"quote.create"})` | `createQuote` (l.42) |
| Quote update | `api/quotes/[id]/route.ts:30` | `await requirePlatform("platform.billing.manage", {action:"quote.update"})` | `updateQuote` |
| Quote cancel | `api/quotes/[id]/route.ts:51` | `await requirePlatform("platform.billing.manage", {action:"quote.cancel"})` | `updateQuoteStatus("cancelled")` |
| Quote send (status→sent) | `api/quotes/[id]/send/route.ts:15` | `await requirePlatform("platform.billing.manage", {action:"quote.send"})` | `updateQuoteStatus("sent")` |
| Order create | `api/orders/route.ts:50` | `await requirePlatform("platform.orders.manage", {action:"order.create"})` | `createOrder` (l.64) |
| Order mutate | `api/orders/[id]/route.ts:93` | `await requirePlatform("platform.orders.manage", {action:"order.update"})` | `updateOrder` |
| Order status | `api/orders/[id]/status/route.ts:41` | `await requirePlatform("platform.orders.manage", {action:"order.status"})` | `updateOrderStatus` |
| Order recipients add | `api/orders/[id]/recipients/route.ts:75` | `await requirePlatform("platform.orders.manage", {action:"order.recipients.add"})` | `addRecipients` |
| Order recipient update | `api/orders/[id]/recipients/[recipientId]/route.ts:30` | `await requirePlatform("platform.orders.manage", {action:"order.recipient.update"})` | `updateRecipientStatus` |
| Order recipient remove | `api/orders/[id]/recipients/[recipientId]/route.ts:68` | `await requirePlatform("platform.orders.manage", {action:"order.recipient.remove"})` | `removeRecipient` |
| Order from-quote | `api/orders/from-quote/route.ts:16` | `await requirePlatform("platform.orders.manage", {action:"order.from_quote"})` | `convertQuoteToOrder` |
| Invoice create | `api/invoices/route.ts:30` | `await requirePlatform("platform.billing.manage", {action:"invoice.create"})` | `createInvoice` |
| Invoice update | `api/invoices/[id]/route.ts:81` | `await requirePlatform("platform.billing.manage", {action:"invoice.update"})` | `updateInvoice` |
| Payment record | `api/invoices/[id]/payments/route.ts:70` | `await requirePlatform("platform.billing.manage", {action:"invoice.payment.record"})` | `recordPayment` |
| Invoice payment-link | `api/invoices/[id]/payment-link/route.ts:16` | `await requireApiRole([...])` (platform-staff shim) | `createInvoicePaymentLink` |

**No money-write route reaches an engine write via only `requireApiAuth`.** (The
`requireApiAuth`-only handlers on these paths are all GET reads — order/invoice list/detail,
payments list — which apply cross-tenant audit for platform staff and company-scoping for tenants.)

### On the tenant `quote.approve` capability
The matrix defines a tenant `quote.approve` (hr/manager ≤limit). There is **no tenant API
route that writes a quote approval** in this app (quotes are platform-managed), so there is
no unguarded tenant write to expose. Should a tenant approve-quote route be added later, it
must call `requireTenant("quote.approve", companyId, { amount })` — the ≤limit conditional is
already proven in the matrix suite.

## 2. Handler-level test (invokes the REAL exported handlers)
`src/app/api/money-write-authz.test.ts` — mocks the collaborators (getAuthContext →
tenant `viewer`, engine write fns → spies) and calls the actual route handlers:
```
 ✓ POST /api/quotes (quote create) → 403, createQuote NOT called
 ✓ POST /api/orders (order create) → 403, createOrder NOT called
 ✓ POST /api/orders/from-quote (order mutate) → 403, convertQuoteToOrder NOT called
 ✓ POST /api/invoices (invoice/billing write) → 403, createInvoice NOT called
 ✓ no audit row is written for a denied tenant viewer (403 before audit)
 Test Files  1 passed (1)   Tests  5 passed (5)
```
Each asserts the handler returns **403 `{ "error": "forbidden", … }`** AND the engine write
function was **never invoked** — proving the gate fires on the request path before any DB write.

## Verification
- `npx tsc --noEmit` → exit 0
- `npm run build` → exit 0
- `npx vitest run src/app/api/money-write-authz.test.ts` → 5 passed
- `npx vitest run src/lib/authz/` → 199 passed
