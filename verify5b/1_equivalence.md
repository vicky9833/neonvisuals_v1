# Item 1 — Equivalence gate (new engine == old engine) — PASS

The new engine (`src/lib/engines/occasion-generator.ts` `generateOccasions`) enumerates the
SHARED occasion types (birthday, work_anniversary, festival, custom) from the SAME computation
the old engine used (`occasions.getCalendarEvents`) — so the migration cannot silently drop or
invent a shared occasion. The §4A additions (milestone/onboarding/probation) are computed from
joining_date as the intended PLUS.

## Fixture set (`_equivalence.ts`, run `_equivalence_run.txt`)
t5b company + 3 employees: Alice (joining 2020-03-01, dob 15/6), Bob (joining NULL, dob 25/12),
Cara (joining 2024-08-01, dob 10/1) + one custom occasion. Horizon = 365 days from today.

## Result — PASS
```
old shared events: 15 · new shared occasions: 15
no occasion DROPPED (old ⊆ new), dropped=0        PASS
no occasion INVENTED (new ⊆ old), invented=0       PASS
shared occasion SET matches exactly (new == old)   PASS
every generated occasion has lead_days + notify_date  PASS
birthday lead_days=14 + notify_date computed          PASS
residue t5b_ companies = 0                            PASS
```
**No occasion was dropped or invented.** The new engine additionally carries per-type
`lead_days` + a blackout-adjusted `notify_date` (which the old engine lacked). For these
fixtures the additive types were {} (no milestone-year or future joiners); items 2/3 exercise
onboarding/probation/rush.

## STOP-for-decision (flagged)
**work_anniversary + milestone overlap**: at a milestone year (1/3/5/10/15/20) the engine
generates BOTH a yearly `work_anniversary` (from getCalendarEvents, T-14) AND a
`milestone_anniversary` (T-30) — i.e. milestones AUGMENT rather than REPLACE the yearly
anniversary. Confirm this is intended, or milestone should suppress the plain anniversary at
milestone years. (Kept augment to preserve equivalence — the old work_anniversary is untouched.)
