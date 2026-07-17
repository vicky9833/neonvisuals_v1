# Item 3 — Digests — PASS

Evidence: `3_digests_run.txt`.

## Platform daily digest (in-app aggregate, PII-safe)
```
platform_admin got a platform_digest in-app                                 PASS
digest title aggregates counts + org count ("N moments across M orgs")      PASS
PII-safe (no employee name in title/body)                                   PASS
idempotent per day (2nd run -> still 1; dedupeKey platdigest:{today})       PASS
```
`runPlatformDigest()` aggregates all orgs' upcoming occasions (next 45 days) → counts by TYPE only
(never an employee name) → in-app to `platform_admin`. Per-day dedupe. (The existing email ops
digest is preserved separately in the cron.)

## Per-user digest frequency (rollup instead of per-event)
```
daily-digest user: emails DEFERRED (0 immediate; deferredDigest=1 per event) PASS
NO per-event email sent to the digest user                                   PASS
immediate user gets the email now (control)                                  PASS
daily rollup sent ONE digest email summarising the events                    PASS
digest subject is a count rollup, PII-safe                                   PASS
deduped per window (2nd run -> still 1)                                       PASS
```
`notify()` now checks `notification_prefs.digest_frequency`: `immediate` (default) sends now;
`daily`/`weekly` DEFERS the email (in-app still written). `runUserDigests(daily|weekly)` rolls up a
user's in-app notifications in the window into ONE email (titles = reference-style, PII-safe),
deduped per window via email_log.
