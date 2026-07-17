# Prompt 6b — PREVIEW SMOKE (deployed foundation preview) — PASS

Deployed foundation preview: `https://neonvisuals-v1-iou9-git-foundation-vicky9833s-projects.vercel.app`
(bypass token + real JWT cookies). Foundation SHA `7a2c221` (dashboard-confirmed READY/green BEFORE
smoking). Migrations 040/041 on the shared DB. Run: `verify6b/_preview_smoke.ts`
(evidence `_preview_smoke_run.txt`). **RESULT: PASS** — zero t6b_ residue.

## Method
- **Committed engine on the DEPLOYED DB + deployed unique indexes (migrations 040/041):** escalation
  (`runOccasionEscalation`), gift-state (`giftChosenFor`, `occasion_gift_state`), digests
  (`runPlatformDigest`/`runUserDigests`), same-date dedupe. The deployed cron runs this SAME engine;
  the global cron is NOT triggered (it emails real tenants + ops digest) — the agreed 6a/5b method.
- **Deployed-HTTP:** the 6a bell API (`GET /api/notifications`), `/api/employees` PII-strip, public
  surface, `/dashboard/team`.

## Per-check results (all PASS)
| Check | Result |
|-------|--------|
| liveness — deployed `GET /api/notifications` (warm poll) | PASS |
| 1 escalation FIRE — occA past half-lead → stage 2 to hr+org_admin+platform_admin; occB past T-3 → stage 3 to hr+org_owner+platform_owner | PASS |
| 2 escalation SUPPRESS — occC WITH gift-state → stage 1 only, stages 2 & 3 SUPPRESSED | PASS |
| 3 gift-state SURVIVES REGEN — new occasion.id, same stable identity → giftChosenFor still true | PASS |
| 4 per-stage DEDUPE — re-run scan → already-fired stage does NOT re-fire (deployed unique index) | PASS |
| 5 same-date company-wide — two festivals on one date → BOTH notify (distinct stable keys via title); the 6a collision is fixed | PASS |
| 6 digests — platform daily in-app aggregate (PII-safe); daily-digest user's immediate email DEFERRED → ONE rollup | PASS |
| 7 PII-safe (§10.13) — ZERO sentinel in escalation/digest titles, links, email subjects; platform bodies PII-free | PASS |
| 8 no regression — 6a bell API; finance PII-strip; owner sees PII; `/`→200, `/dashboard`→307, `/nonexistent`→403; `/dashboard/team`→200 | PASS |

## The blockers to watch (per the prompt) — all clear
- Escalation does NOT fire despite gift-state (suppression holds). ✅
- gift-state SURVIVES regen. ✅
- same-date company-wide does NOT dedupe one away. ✅

## Residue
Zero. Smoke self-tears-down (finally); the global `platdigest:{today}` row (written to the real
founder, company_id NULL — doesn't cascade) explicitly deleted; escalation/occasion_ops rows tied
to the t6b company cascade on company delete; org_owner member + company via MCP disable-trigger;
users via `_cleanup_users.mjs`. Final (MCP): notifications=0, occasion_gift_state=0,
notification_prefs=0, t6b companies=0, platform_staff=1 (founder untouched).

## Deploy status
Foundation preview live + green on `7a2c221`. **HOLDING for the promote call — not touching main.**
