# Item 3 — Lead-time + blackout skip + rush state (§4H) — PASS

Blackout sources: org (`companies.blackout_dates[]`) + platform (`platform_blackout_dates`,
the minimal store added in migration 039 — production/delivery kinds). The lead-time engine
(`computeNotify`) counts `lead_days` NON-blackout days backward from the occasion date, so the
order-by date moves EARLIER to skip blackout days ("can we still make this").

Acceptance (`_engine.ts`, run `_engine_run.txt`):
```
no blackout: notify = occasion - 10 calendar days                       PASS
blackout skip: notify pushed earlier by the 3 blackout days (-> -13)     PASS
normal occasion: not rush                                                PASS
occasion inside its lead window -> rush=true                             PASS
soon birthday (lead 14, ~3 days out) marked is_rush=true (generator)     PASS
future onboarding (notify ~15 days out) NOT rush                         PASS
```
- **Blackout skip**: 3 blackout days in the 10-day window → notify moves from occasion−10 to
  occasion−13.
- **Rush**: when the computed notify_date has already passed (we're inside the lead window), the
  occasion is flagged `is_rush=true`. The rush STATE lands here; concierge ROUTING is Prompt 7.
