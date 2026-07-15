# C2 — `createAdminClient()` / Service-Role CALL-SITE SWEEP

`createAdminClient()` (src/lib/supabase/admin.ts) uses `SUPABASE_SERVICE_ROLE_KEY`
and **BYPASSES RLS entirely**. Per the policy header in `src/lib/supabase/server.ts`,
it is permitted ONLY in webhooks, cron, or explicit cross-tenant PLATFORM-plane ops.
For each call site below: entrypoint type + whether an authenticated end-user session
is in scope + which domain (billing/order/quote/lead/memory) it belongs to.

| File | Domain | Entrypoint type | End-user session in scope? | RLS bypass justified today? |
|------|--------|-----------------|----------------------------|------------------------------|
| src/lib/engines/quote.ts (10+ sites: create/get/list/update/status/pdfUrl) | **quote** | [user-request: called from route handlers/actions] | YES (dashboard user) | ❌ NO — tenant-plane work via service role. **Prompt 2 fix target.** |
| src/lib/engines/order.ts (20+ sites: create/update/get/list/history/recipients/stats/fromQuote) | **order** | [user-request: route handlers] | YES | ❌ NO — tenant-plane. **Prompt 2 fix target.** |
| src/lib/engines/billing.ts (invoices/payments/getBillingStats + `handleRazorpayWebhook`) | **billing** | Mixed: [user-request] for invoice/payment CRUD; [system: webhook] for `handleRazorpayWebhook` | YES for CRUD; NO for webhook | Webhook path ✅ justified; invoice/payment CRUD ❌ **Prompt 2 fix target.** |
| src/lib/engines/lead.ts (create/update/get/list/score/activities/status) | **lead** | Mixed: [system: public lead capture] insert; [user-request: platform CRM] for the rest | NO for public capture; YES (platform staff) for CRM | Public capture ✅; CRM reads are platform-plane (acceptable) but should still be gated by platform-staff check |
| src/lib/engines/pricing.ts (`getProductPricing`) | pricing (supports quote/order) | [user-request] via quote/order build | YES | Reads `products` (global catalog, not tenant data). Low risk; pricing is non-public but not tenant-scoped. |
| src/lib/engines/pdf.tsx (`saveQuotePDF` → storage + setQuotePdfUrl) | quote | [user-request] | YES | ❌ tenant-plane storage write via service role. **Prompt 2 fix target.** |
| src/lib/services/recipients.ts (`resolveCompanyRecipients`) | order/memory | Called from cron (reminders) AND order flows | Mixed | Cron path ✅; order path is tenant-plane |
| src/lib/services/email.ts (`email_log` insert, dedupe check) | infra/email | Called from webhooks, cron, and user flows | Mixed | Logging table; acceptable via service role |
| src/app/api/reminders/cron/route.ts | occasions/reminders | [system: cron] (CRON_SECRET gated) | NO | ✅ justified (cron, cross-tenant by design) |
| src/app/api/admin/team/route.ts | platform admin | [user-request: route handler] gated by `requireApiRole(["super_admin"])` | YES (platform) | ✅ platform-plane op (reads/writes `profiles`) |
| src/app/(auth)/onboarding/actions.ts | auth/onboarding | [user-request: server action] | YES | Bootstraps profile/company at onboarding — needs elevated write before membership exists. Borderline-justified; review in Prompt 2. |
| src/app/api/webhooks/razorpay/route.ts (delegates to billing.handleRazorpayWebhook) | billing | [system: webhook] (signature-verified) | NO | ✅ justified |

## Domain rollup (which engines bypass RLS for tenant-plane work — the fix list)
- **billing** — invoice/payment CRUD + stats (webhook portion OK)
- **order** — nearly all functions
- **quote** — all functions + pdf save
- **lead** — CRM reads/writes (public capture insert OK)
- **memory** — ⚠️ **DISCREPANCY:** `server.ts` lists `memory.ts` as a known violation, but
  `src/lib/engines/memory.ts` actually uses the **request-scoped cookie client**
  (`createClient` from `@/lib/supabase/server`), NOT `createAdminClient`. It relies on RLS
  today. **Flagged assumption for confirmation** — either the comment is stale, or a
  future refactor was anticipated. It is NOT currently an RLS-bypass violation.

## Headline
Service-role RLS bypass is genuinely justified in **cron** (`/api/reminders/cron`),
**webhook** (`/api/webhooks/razorpay`), and the **platform admin** route
(`/api/admin/team`). It is a **tenant-plane violation** in **quote, order, billing
(CRUD), pdf, and lead (CRM)** engines — these are Prompt 2's authorization rework
targets. `memory.ts` is already on the RLS cookie client (contradicting the server.ts note).
