# Prompt 5b — Summary (foundation; hold for promote)

Occasion auto-generation engine + per-type lead-time + blackout + rush; reminders cut over to a
DOWNSTREAM consumer of occasions instances. Additive + engine-replacement; no true drops.

## THE GATE — item 1 EQUIVALENCE PASSED
On identical synthetic fixtures the NEW engine's shared-type occasion set
(birthday/work_anniversary/festival/custom) EQUALS the OLD engine's (getCalendarEvents): 15==15,
**zero dropped, zero invented** — plus the new per-type lead_days/notify_date. No silent divergence.

## Build health
- `npx tsc --noEmit` → **exit 0** (`_tsc.txt` implied; ran clean)
- `npm run build` (Next 16 / Turbopack) → **GREEN**, Proxy middleware registered (`_build.txt`)

## Per-item pointers
| Item | Artifact | Result |
|------|----------|--------|
| 1 equivalence gate | `1_equivalence.md` (`_equivalence_run.txt`) | **PASS** — new==old shared set, no drop/invent |
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

## Residue
Zero. All t5b_ fixtures deleted per script (no members created → no last-owner-guard step).
Final: t5b companies=0, occasions=0, reminders=0, t5b email_log=0.

## STOP-for-decision points (confirm on promote)
1. **work_anniversary + milestone overlap** — at milestone years (1/3/5/10/15/20) the engine
   generates BOTH the yearly work_anniversary (T-14) AND milestone_anniversary (T-30) — AUGMENT,
   not replace (kept to preserve equivalence). Confirm, or milestone should suppress the plain
   anniversary at those years.
2. **Reminder cadence change** — old = 4-reminder ladder [7,3,1,0] per occasion; new = ONE reminder
   at the per-type lead notify_date (the §4 lead-time model). Email PATH preserved; cadence changed
   by design. Confirm acceptable.
3. **Probation +90 only** — generated at joining+90 (not +180). Confirm whether +180 is also wanted.
4. **Platform blackout store** — added minimal `platform_blackout_dates` (production/delivery), the
   sanctioned "add a minimal one". Confirm the shape (currently platform-global, not per-region).
5. **Onboarding/probation only for FUTURE joiners within horizon** — past joiners' onboarding/
   probation already elapsed, so skipped. Confirm.

## NOT built (Prompt 6/7): notification matrix/dispatch, concierge routing. 5b sets occasion
## instances + lead dates + rush state; P6 dispatches, P7 routes. Foundation only. Holding.
