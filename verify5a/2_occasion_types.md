# Item 2 — occasion_types config — PASS

Table `occasion_types` (migration 035): `key PK, label, category ∈ {person,sensitive,company},
default_lead_days, default_budget, is_sensitive, auto_generate, requires_consent, timestamps`.
RLS: readable by any authenticated member (+ platform); writable ONLY by platform staff (config,
seeded — tenants don't edit); service_role; anon revoked.

## Seed (19 types) — spot-check PASS (`_acceptance_run.txt`)
```
birthday              lead=14  auto_generate=true    PASS
milestone_anniversary lead=30                        PASS
onboarding            lead=5 (days BEFORE joining)   PASS
probation_completion  lead=7                          PASS
wedding               is_sensitive=T requires_consent=T auto_generate=F  PASS
```
- §4A person auto-gen: birthday 14, work_anniversary 14, milestone_anniversary 30, onboarding 5,
  probation_completion 7 — all `auto_generate=true`.
- Onboarding sign: `default_lead_days` = days BEFORE the occasion date (uniform semantics). For
  onboarding the date = joining date and the deliverable is due ON that date; lead 5 = prepare 5 days
  before. Documented on the table comment.
- §4B sensitive (wedding, new_baby, bereavement, get_well): `is_sensitive=true`,
  `auto_generate=false`, `requires_consent=true`.
- §4C company (promotion, spot_award, quarterly_mvp, annual_award, company_anniversary, team_offsite,
  client_appreciation, deal_closure, farewell, retirement): `auto_generate=false`.

## ⚠️ FLAGGED (STOP-for-decision)
Only §4A person leads (14/14/30/5/7) and §4D festival leads were numerically pinned in the prompt.
**§4B/§4C default_lead_days are PROVISIONAL** (reasonable values: wedding 30, new_baby 21, promotion 7,
etc.) — confirm against the spec's §4B/§4C lead tables, or they stand as sensible defaults. `default_budget`
left null pending spec.
