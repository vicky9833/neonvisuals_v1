# Item 6 — engines off the service-role client

## Per-site switch (service-role → request-scoped RLS client `userDb()`)
| Engine | Functions moved to user client | Kept ELEVATED (service role) |
|--------|-------------------------------|------------------------------|
| `quote.ts` | createQuote, getQuote, getQuoteByNumber, listQuotes, updateQuoteStatus, updateQuote, setQuotePdfUrl | — |
| `order.ts` | createOrder, updateOrder, getOrder, listOrders, getStatusHistory, updateOrderStatus, addRecipients, updateRecipientStatus, removeRecipient, getOrderRecipients, convertQuoteToOrder, listCompanyEmployees, listCompaniesForOrders, getOrderStats, bumpPreferences(injected) | — |
| `billing.ts` | createInvoice, updateInvoice, getInvoice, listInvoices, recordPayment, getPayments, createInvoicePaymentLink, getBillingStats | **handleRazorpayWebhook** + threaded `recordPayment/getInvoice/recomputeOrderPaymentStatus` (no user session) |
| `lead.ts` | updateLead, getLead, listLeads, updateLeadStatus, getLeadStatusHistory, addActivity, getActivities, calculateLeadScore, getLeadStats, getPipelineData, getNewLeadsToday | **captureLead** (PUBLIC), **convertLeadToClient** (company insert), **createLead** (injectable; capture passes elevated) |
| `pdf.tsx` | `setQuotePdfUrl` write via quote.ts (user client) | storage upload (no storage RLS in scope) |
| `memory.ts` | untouched (already RLS client) | — |

## Also kept elevated (unchanged, justified)
`/api/reminders/cron` (cron), `/api/ops/team` (platform staff mgmt), `resolveCompanyRecipients`
(cron), onboarding company insert.

## Client/server boundary
Engines import the request client DYNAMICALLY (`userDb()` = `await import("@/lib/supabase/server")`)
and pure runtime constants were extracted to `order-constants.ts` / `lead-constants.ts`, so
client components importing engine values never pull `next/headers` into the client bundle.

## `server.ts` note corrected
The stale "memory.ts violation" note removed; replaced with the accurate migrated/kept-elevated list.

tsc + build green (see 0_summary.md).
