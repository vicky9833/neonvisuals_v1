# Item 4 — Escalation/digest cron (idempotent) — PASS

Evidence: `4_cron_run.txt`.

```
stage2 fired once after run 1                                               PASS
stage2 NOT re-fired after run 2 (per-stage dedupe)                          PASS
platform digest once after run 1                                            PASS
platform digest NOT re-fired after run 2 (per-day dedupe)                   PASS
```

Wiring (`src/app/api/reminders/cron/route.ts`, the existing daily cron @ 07:00 IST, `CRON_SECRET`):
- **1c. Escalation scan** (per company): reads upcoming occasions (`date >= today`) and calls
  `runOccasionEscalation` — fires stages 2/3 when no gift is chosen, suppresses when one is.
- **3b. Digests**: `runPlatformDigest` (in-app platform aggregate) + `runUserDigests("daily")`
  (weekly on Mondays) after the per-company loop.

Idempotency: escalation is per-stage deduped (`occ-esc:{stable}:{stage}` unique index), platform
digest per-day deduped (`platdigest:{today}`), user digests per-window deduped (email_log). A second
run the same day re-fires nothing. Cold-render safety: the cron uses the admin client directly (not
a page render); any smoke that drives it must poll (never measure render 1). Per prod safety, the
global cron is NOT triggered in smokes — the engine is exercised against the deployed DB + indexes.
