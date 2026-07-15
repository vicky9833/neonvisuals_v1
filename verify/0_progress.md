# Prompt 2 — PROGRESS CHECKPOINT (not the final bundle)

Foundation branch. Nothing committed/pushed yet. Tree is **build-green** (tsc exit 0,
`next build` exit 0). All DB changes so far are ADDITIVE / constraint-loosening only.

## DONE + verified
| Item | Status | Evidence |
|------|--------|----------|
| 1. Two-plane permission matrix + authorize() | ✅ COMPLETE | `verify/1_matrix.md` — 166 Vitest cases (every role×capability both planes; pass+fail for own-dept / ≤limit / shipping-only). `src/lib/authz/matrix.ts` + `context.ts`. |
| 9. product-copy `.trim()` crash | ✅ COMPLETE | `verify/9_trim.md` — guarded `humaniseName`, 6 tests pass incl. undefined/null. |
| (item 1 column) employees.department_id | ✅ APPLIED | migration `019` — nullable FK→departments, verified in DB. |
| 6 (DB half). Tenant/platform WRITE policies | ✅ APPLIED | migration `020` — isolation-mirror write policies on quotes/orders/invoices/payments/order_items/order_status_history/order_recipients + platform-staff write on gift_records/employee_preferences. |
| 8 (DB half). audit_log company_id FK drop | ✅ APPLIED | migration `021` — FK dropped (verified 0 remaining), append-only trigger intact. |
| 3/8 (DB half). audit_log INSERT policy | ✅ APPLIED | migration `022` — `audit_log_insert_self` (actor_user_id = auth.uid()). |
| audit writer | ✅ CODE | `src/lib/authz/audit.ts` — writes via request-scoped client (never service-role). |

## REMAINING (coupled auth cutover — code)
| Item | Work | Risk notes |
|------|------|-----------|
| 6 (code). Engines → user client | Thread request-scoped client through quote/order/billing/pdf; KEEP elevated: `handleRazorpayWebhook` (+ its private helpers), reminder cron, `/api/admin/team`; correct the stale `memory.ts` "violation" note in `server.ts`. | Edge cases: public `get-quote`/lead-capture (no session) and webhook-invoked billing must stay elevated. |
| 3. Re-home super_admin cross-tenant override | Gate former override sites (orders/invoices/quotes/billing routes) via `authorizePlatform()` + `writeAudit()`; no silent service-role cross-tenant. | Pairs with item 6. |
| 4. Retire ~23 profiles.role reads | Replace with matrix/authorize(); keep column. | Touches ~14 route files + pages + `auth.ts`/`api-auth.ts`. |
| 5. Onboarding → company_members + read-path cutover | Onboarding writes an `org_owner` membership; migrate tenant-scoping reads off `profiles.company_id`; orphan user → onboarding. | |
| 2. Default-deny middleware + allowlist + wrapper | proxy.ts + layout/route wrapper; explicit allowlist; 3 tenant outcomes (allow/403/onboarding-redirect). | Security-critical; needs the verify evidence (403 body, onboarding redirect, off-allowlist deny). |
| 7. /admin → /ops rename + link/URL/email fixes | Move route tree; delete leaked Admin Panel link; `/admin`→`/ops` redirect; fix email CTA lines. | Mechanical but broad. |

## Migrations applied to hosted `xserhblhiwtmaiejbvgo` (free plan, no PITR)
019, 020, 021, 022 — all additive / loosening. Local files saved under `supabase/migrations/`.
No `t20_` probe rows were written (all verification was schema/count reads + pure unit tests).
