# Item 2 — null joining_date + onboarding sign + year-agnostic birthday — PASS

Acceptance (`_engine.ts`, run `_engine_run.txt`):
```
null-joining employee -> birthday ONLY (no anniv/onboarding/probation/milestone)   PASS
null joining_date counted in the "missing joining_date" surface (missing=2)         PASS
year-agnostic birthday next-occurrence crosses year boundary (Jan 10 -> 2027-01-10) PASS
onboarding present for a future joiner                                              PASS
onboarding notify_date = joining_date - 5 (BEFORE joining) (2026-07-31 < 2026-08-05) PASS
```
- **Null joining_date**: skipped gracefully (no crash, no garbage occasion); birthday still
  generated (dob-sourced); the employee is counted in `generateOccasions().missingJoiningDate`
  so HR can fix it (silent skip = missed gift).
- **Onboarding sign**: `notify_date = joining_date − 5` — 5 days BEFORE joining (kit on desk day
  one), not after. Proven strictly less than joining_date.
- **Year-agnostic birthday**: dob has month/day, NO year; next occurrence computed relative to
  today — a Jan-10 birthday viewed mid-2026 correctly resolves to 2027-01-10.
