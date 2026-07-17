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
**No occasion was dropped or invented** for these (non-milestone) fixtures. The new engine
additionally carries per-type `lead_days` + a blackout-adjusted `notify_date` (which the old
engine lacked). For these fixtures the additive types were {} (no milestone-year or future
joiners); items 2/3 exercise onboarding/probation/rush; `_milestone.ts` exercises the milestone
suppression below.

## RESOLVED RULING — milestone SUPPRESSES work_anniversary at milestone years {5,10,15,20}
The overlap flagged in the build pass is now decided: at a milestone year the premium
`milestone_anniversary` (T-30) **REPLACES** the plain `work_anniversary` (T-14) — one gift, not
two. This is an **INTENDED divergence** from strict equivalence, scoped to milestone-year
anniversaries only. Milestone set is **{5,10,15,20}** (years 1 and 3 are NOT milestones and keep
the plain T-14 anniversary).

- **Non-milestone equivalence still holds exactly**: `_equivalence.ts` (Alice 7-yr, Cara 2-yr —
  both non-milestone) → 15==15, zero dropped/invented (re-run above). The suppression touches
  ONLY `${employee}|${anniversaryDate}` pairs whose year-count ∈ {5,10,15,20}.
- **Suppression proof** (`_milestone.ts`, run `_milestone_run.txt`): a 10-yr employee →
  `milestone_anniversary` present, `work_anniversary` SUPPRESSED, exactly ONE anniversary-family
  occasion (no double-gift). A 3-yr employee → plain `work_anniversary` present, NO milestone.
```
10-yr: milestone_anniversary PRESENT                         PASS
10-yr: plain work_anniversary SUPPRESSED (not present)       PASS
10-yr: exactly ONE anniversary-family occasion (no double)   PASS
10-yr: milestone on same anniversary date, lead 30           PASS
3-yr: plain work_anniversary PRESENT                         PASS
3-yr: NO milestone_anniversary                               PASS
3-yr: work_anniversary lead 14 (regular)                     PASS
```

Implementation: `generateOccasions` precomputes each employee's next anniversary + year-count,
builds a `suppressSet` of milestone-year `${employeeId}|${date}` pairs, and skips exactly those
`work_anniversary` events in the shared-types loop before emitting the milestone in the §4A loop.
