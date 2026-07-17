# Prompt 5b — Summary (foundation; hold for promote)

Occasion auto-generation engine + per-type lead-time + blackout + rush; reminders cut over to a
DOWNSTREAM consumer of occasions instances. Additive + engine-replacement; no true drops.

## THE GATE — item 1 EQUIVALENCE PASSED
On identical synthetic fixtures the NEW engine's shared-type occasion set
(birthday/work_anniversary/festival/custom) EQUALS the OLD engine's (getCalendarEvents): 15==15,
**zero dropped, zero invented** — plus the new per-type lead_days/notify_date. No silent divergence.
The ONE intended divergence — milestone_anniversary suppressing work_anniversary at years
{5,10,15,20} — is scoped, documented, and separately proven (`_milestone.ts`); non-milestone
equivalence remains exact.

## Build health
- `npx tsc --noEmit` → **exit 0** (`_tsc.txt` implied; ran clean)
- `npm run build` (Next 16 / Turbopack) → **GREEN**, Proxy middleware registered (`_build.txt`)

## Per-item pointers
| Item | Artifact | Result |
|------|----------|--------|
| 1 equivalence gate | `1_equivalence.md` (`_equivalence_run.txt`) | **PASS** — new==old shared set, no drop/invent |
| 1b milestone suppression (ruling) | `1_equivalence.md` (`_milestone_run.txt`) | **PASS** — 10-yr→milestone only, 3-yr→plain anniv |
| 2 null-DOJ / onboarding sign / year-agnostic bday | `2_edges.md` (`_engine_run.txt`) | PASS — skip+count, notify=join−5, cross-year birthday |
| 3 lead-time + blackout skip + rush | `3_blackout_rush.md` (`_engine_run.txt`) | PASS — blackout-back-off + rush flag |
| 4 reminders downstream of occasions | `4_cutover.md` (`_cutover_cap_run.txt`) | PASS — occasion-sourced reminder + real Resend send |
| 5 festival Free=3 cap | `5_cap.md` (`_cutover_cap_run.txt`) | PASS — gate + route set-logic |

## Migration (applied to shared DB + repo)
- `039_occasion_engine_leadtime_blackout` — occasions.notify_date + is_rush; occasion_types
  'festival'/'custom' keys; platform_blackout_dates table + RLS.

## Code
- NEW `src/lib/engines/occasion-generator.ts` — `generateOccasions` (reuses getCalendarEvents for
  shared types → equivalence-safe; adds §4A milestone/onboarding/probation; lead-adjusted
  notify_date; rush flag; idempotent regen of auto_generated occasions) + exported pure `computeNotify`.
- `occasions.ts` `generateReminders` — rewritten occasion-sourced (reads occasions.notify_date).
- `/api/reminders/cron` + dashboard — call `generateOccasions` then `generateReminders`.
- `/api/occasions/festivals` POST — wired festival Free=3 cap.

## Preview smoke (deployed foundation) — PASS
`PREVIEW_smoke.md` (`_preview_smoke_run.txt`): all 6 items PASS on the deployed foundation preview
(`10d1539`) — cutover (reminders sourced from occasions), milestone suppression, onboarding sign,
blackout ORG **and PLATFORM** skip + rush, email-once, festival cap, no regression. Documented a
test-harness finding: the dashboard resolves company via `profiles.company_id` (linked at
onboarding); admin-created test users needed a profiles UPDATE to link — not a product bug.

## Residue
Zero. All t5b_ fixtures deleted per script; org_owner members/companies via MCP disable-trigger
(`trg_guard_last_owner`); auth users via `_cleanup_users.mjs`; global `platform_blackout_dates`
t5b_ rows deleted post-measurement. Final (MCP): companies=0, members=0, occasions=0, profiles=0,
platform_blackout=0, email_log=0, users=0.

## RESOLVED RULINGS (folded in — user decisions)
1. **Milestone SUPPRESSES work_anniversary at years {5,10,15,20}** — RULED: milestone_anniversary
   (T-30) REPLACES the plain work_anniversary (T-14) at those years (no double-gift). Years 1/3 and
   all non-milestone years keep the plain T-14 anniversary. Implemented + proven (`_milestone.ts`);
   non-milestone equivalence unchanged (15==15). Intended divergence documented in `1_equivalence.md`.
2. **Reminder cadence single-lead** — CONFIRMED: ONE reminder per occasion at the per-type lead
   notify_date (email PATH preserved). **HARD OBLIGATION for Prompt 6**: implement the §7 escalation
   ladder (lead → half-lead-no-gift → T-3-nothing). 5b intentionally does NOT ship the ladder.
3. **Probation +90** — CONFIRMED default (`PROBATION_DAYS = 90` const). Per-company configurability
   is a Prompt 8 settings seam (§4A "configurable period") — const left as the single tuning point.
4. **platform_blackout_dates** — shape CONFIRMED (production/delivery, platform-global). Lead-time
   engine READS platform blackout in addition to org blackout (proven in preview smoke item 4).
5. **Onboarding/probation only for FUTURE joiners within horizon** — CONFIRMED (past joiners'
   windows already elapsed, so skipped; birthday still generates for null-joining employees).

## NOT built (Prompt 6/7): notification matrix/dispatch, concierge routing. 5b sets occasion
## instances + lead dates + rush state; P6 dispatches, P7 routes. Foundation only. Holding.
