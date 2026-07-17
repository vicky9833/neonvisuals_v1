# Item 1 — occasion_gift_state survives occasion regeneration — PASS

Evidence: `1_gift_state_run.txt`.

```
giftChosenFor FALSE before any gift-state                                   PASS
giftChosenFor TRUE after gift-state written                                 PASS
giftChosenFor STILL TRUE after regen (new occasion.id, same stable key)     PASS
stable key identical across regen                                           PASS
duplicate stable_key rejected (unique constraint 23505)                     PASS
company-wide same-date festivals -> DISTINCT keys (title disambiguates)     PASS
employee key carries NO name (uuid only, PII-safe)                          PASS
residue gift_state = 0                                                       PASS
```

- `occasion_gift_state` (migration 041) is keyed on a single `stable_key TEXT UNIQUE` computed by
  `stableOccasionKey()` — independent of the ephemeral `occasions.id` (deleted+reinserted each cron
  run). Regenerating the occasion keeps the same stable key → `giftChosenFor()` still true. **The
  signal survives regen** — without this the whole escalation gate is worthless.
- Stable-key uniqueness (the flagged decision): employee occasions are unique by
  (company, employee, type, date); company-wide festival/custom append `title` to disambiguate
  same-date collisions. Employee keys are uuid-only (no PII). The UNIQUE constraint on a computed
  text key sidesteps the nullable-employee_id NULL-distinct problem.
