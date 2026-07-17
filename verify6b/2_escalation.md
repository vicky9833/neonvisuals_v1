# Item 2 — §7 escalation ladder — PASS (the 5b obligation)

Stages off the occasion's lead date, reading `occasion_gift_state`. Stage 1 (lead-time) is 6a's
`notifyOccasionAtLeadTime`; 6b adds stages 2 & 3. Evidence: `2_escalation_run.txt`.

- **Stage 2** — occasion_date − floor(lead_days/2), IF no gift chosen → hr + org_admin (tenant) +
  platform_admin.
- **Stage 3** — occasion_date − 3, IF still no gift → hr + org_owner (tenant) + platform_owner (urgent).
- **Suppression** — `giftChosenFor(occasion)` TRUE → stages 2 & 3 do NOT fire.

```
occA (today+5, lead14): stage2 fired, stage3 NOT                            PASS
occA stage2 tenant audience = {hr, org_admin}                               PASS
occA stage2 platform audience includes platform_admin                       PASS
occA NO stage3 notifications                                                PASS
occB (today+2, lead14): stage3 fired                                        PASS
occB stage3 tenant audience = {hr, org_owner}                               PASS
occB stage3 platform audience includes platform_owner                       PASS
occC WITH gift-state: SUPPRESSED (no stages fire, zero notifications)       PASS
per-stage dedupe: re-running the scan does NOT re-fire stage2               PASS
PII-safe: zero employee name in titles/links; platform bodies PII-free;     PASS
         tenant body names person (authorised, RLS) — non-vacuous
```

- Reads `occasion.lead_days` + `occasion_type_key` from the occasion row (NOT the reminder, whose
  `reminder_type` collapses milestone/onboarding/probation → work_anniversary — recon R1).
- Per-stage dedupe key `occ-esc:{stable}:{stage}` (tenant) / `occ-escops:{stable}:{stage}` (platform)
  via the 6a DB unique index → each stage fires at most once; the scan is idempotent.
- Tenant/platform split (two notify() calls per stage) keeps employee PII out of platform sends.

**SUPPRESSION is the whole point and it holds: choosing a gift stops the escalation.**
