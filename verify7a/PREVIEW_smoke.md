# Prompt 7a — PREVIEW SMOKE (deployed foundation preview) — PASS

Deployed foundation preview: `https://neonvisuals-v1-iou9-git-foundation-vicky9833s-projects.vercel.app`
(bypass token + real JWT cookies). Foundation SHA `d9bf57d` (dashboard-confirmed READY/green BEFORE
smoking). Migration 042 on the shared DB. Run: `verify7a/_preview_smoke.ts`
(evidence `_preview_smoke_run.txt`). **RESULT: PASS** — zero t7a_ residue; 1 pre-existing real
quote preserved.

## Method
- **Deployed-HTTP:** the tenant quote-request route (`POST /api/quotes/request`) — the gift-state
  WRITE it performs is deployed code; auth (403/201); `/dashboard/quotes` render; bell; public.
- **Committed engine on the DEPLOYED DB + indexes:** escalation suppress/resume/persist
  (`runOccasionEscalation`, `clearGiftChosenForQuote` = what `updateQuoteStatus` cancel calls,
  `markGiftOrderedForQuote` = what `convertQuoteToOrder` calls). The cron runs this same engine;
  global cron NOT triggered.

## Per-check results (all PASS)
| Check | Result |
|-------|--------|
| liveness — quote-request route deployed (finance→403, not 404) | PASS |
| 3 auth — finance/viewer DENIED (403); **Free company hr CAN request (201, ungated)** | PASS |
| 1a+2 — hr request FOR occasion → 201; **deployed occasion_key == stableOccasionKey** (they join); gift-state written; escalation **SUPPRESSED** | PASS |
| 1b — cancel (no order) → gift-state **CLEARED** → escalation **RESUMES** (stage 2 fires) | PASS |
| 1c — request → convert → gift-state **PERSISTS** (ordered + order_id); reversal won't clear it; stays suppressed | PASS |
| 1d — survives occasion regeneration (new occasion.id, same stable identity) | PASS |
| 4 — tenant `/dashboard/quotes` populates (RLS own-company; org_id→company_id fix); route 200 | PASS |
| 5 — PII-safe ops notification: org context present, ZERO employee sentinel in title/body/link/subject | PASS |
| 6 — no regression: `/`→200, `/dashboard`→307, `/nonexistent`→403, 6a bell, `/api/contact` lead | PASS |

## Blockers (per the prompt) — all clear
Suppression FIRES on request; RESUMES on cancel; the stable keys MATCH (suppression hits the right
occasion — the deployed quote's `occasion_key` equals what `giftChosenFor()` computes).

## Residue
Zero. Smoke self-tears-down (finally); global gift-state + ops-notifications (incl. any resolving to
the real founder via company_id) cascade-cleaned on company delete; quote_request_ops email_log +
`/api/contact` test lead cleaned; auth users via `_cleanup_users.mjs`. Final (MCP): t7a companies=0,
gift_state=0, notifications=0, quotes_total=1 (pre-existing real quote UNTOUCHED), t7a leads=0.
By-design: quote-request + `/api/contact` fire internal ops alerts to the founder (expected).

## Deploy status
Foundation preview live + green on `d9bf57d`. **HOLDING for the promote call — not touching main.**
