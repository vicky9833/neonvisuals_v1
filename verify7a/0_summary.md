# Prompt 7a — Tenant quote-request + stable occasion link + gift-chosen write — SUMMARY

Additive/expand + reversible-rename. foundation only; hold for promote. Builds on 6b (occasion_gift_state).

## Build health (final committed tree)
- `npx tsc --noEmit` → **exit 0**
- `npm run build` (Next 16 / Turbopack) → **GREEN**

## The two gates — PASSED
- **gift-chosen SUPPRESSES escalation; CANCEL RESUMES it (item 3) — PASSED.** Quote-request for an
  occasion writes `occasion_gift_state` → 6b escalation stages 2/3 suppress; cancel/reject with no
  order clears it → escalation resumes; convert-to-order persists it (order_id linked). Survives
  occasion regeneration (stable key).
- **The quote's stable occasion key MATCHES occasion_gift_state (item 1) — PASSED.** `quotes.occasion_key`
  = `stableOccasionKey(...)` = the gift-state row's `stable_key` → they join; `giftChosenFor()` true.

## Per-item pointers
| Item | Artifact | Result |
|------|----------|--------|
| 1 stable occasion link + org_id standardization | `1_occasion_link.md` (`1_occasion_link_run.txt`) | **PASS** |
| 2 tenant quote-request (matrix + RLS) | `2_quote_request.md` (`2_quote_request_run.txt`) | **PASS** |
| 3 gift-chosen write + reversal (P6) | `3_gift_chosen.md` (`3_gift_chosen_run.txt`) | **PASS** |
| 4 tenant quote view + PII-safe | `4_view_safe.md` (`4_view_safe_run.txt`) | **PASS** |

## Migration
- `042_quote_occasion_link` — `quotes.occasion_key TEXT` (+ partial index) = the STABLE occasion
  identity (never occasions.id); **`org_id` → `_deprecated_org_id`** (reversible standardization).

## Code (additive)
- NEW `src/lib/engines/quote-request.ts` — `requestQuote()` (tenant, company-scoped, occasion-linked,
  writes gift-state) + `listCompanyQuotes()`.
- NEW `POST /api/quotes/request` — `requireTenant("quote.request")` (§6A: hr/org_admin/org_owner/
  manager; finance/viewer denied); fires a PII-safe ops notification (in-app + email + wa.me).
- `notifications.ts` — `writeGiftChosen` / `clearGiftChosenForQuote` / `markGiftOrderedForQuote`
  (the P6 gift-state write/reversal/persist); `QUOTE_REQUEST_OPS` type.
- `quote.ts` `updateQuoteStatus` — clears gift-state on cancelled/rejected (reversal).
- `order.ts` `convertQuoteToOrder` — persists gift-state (ordered + order_id).
- `dashboard/queries.ts` — `org_id` → `company_id` (2 sites, the standardization).
- `dashboard/quotes/page.tsx` — real RLS-scoped tenant quote list (was a placeholder).

## STOP-for-decision — org_id/company_id (resolved)
quotes had BOTH `org_id` and `company_id` (both NULL on the one existing quote). RLS keys on
`company_id`; `org_id` was read ONLY by 2 dashboard queries and written by NO create path — they are
**redundant, not legitimately different**. Standardized on `company_id` (tenant convention): fixed
the 2 dashboard reads, reversibly renamed `org_id → _deprecated_org_id` (index follows the rename).
Not a guess — verified no legitimate divergence.

## Assumptions / notes
- Tenant-requested quotes use status **`draft`** (no `requested` value in the enum — did not invent);
  ops later prices/sends. quote_number auto-generated `REQ-YYYYMMDD-XXXXX`.
- "gift chosen" trigger = **quote-REQUEST** (earliest suppression), per recon R4 recommendation.
- Reversal ruling implemented: cancel/reject with no order CLEARS gift-state (escalation resumes);
  converted-to-order gift PERSISTS.
- Gift ordering is UNGATED (both tiers, §8 never-gate-revenue). Approval workflows (Pro) = 7b.

## Residue
Zero. All t7a_ fixtures self-cleaned (tests used no org_owner members → no MCP needed); auth users
via `_cleanup_users.mjs`; global gift-state/notifications swept. Final (MCP): t7a companies=0,
gift_state=0, notifications=0, quotes_total=1 (pre-existing real quote untouched), t7a users=0.

## NOT built (later phases): approval routes/budgets (7b), order lifecycle/proof photos/tracking
(7c), concierge (7d), session-bridge polish (7e). Foundation only. Holding.
