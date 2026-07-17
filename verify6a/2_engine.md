# Item 2 — Notification engine (+ item 6 prefs honored) — PASS

`notify(client, input)` resolves the audience (item 1) and, per recipient × their
`notification_prefs`, writes an in-app `notifications` row and fires email via the existing
`sendEmail` path. Evidence: `2_engine_run.txt`.

Fixtures: company A, 3 hr users. Prefs: r1 default (in_app+email), r2 email=OFF (in_app only),
r3 in_app=OFF (email only). One `notify()` with an email spec.

```
resolved 3 recipients                                    PASS
inApp = 2 (r1,r2; r3 in_app=false)                       PASS
emailed = 2 (r1,r3; r2 email=false)                      PASS
suppressedEmail = 1 (r2)                                 PASS
in-app rows for r1 + r2 only (r3 none)                   PASS
r1 row correct (recipient/company/type/link)             PASS
r1 channels_sent = [in_app, email]                       PASS
r2 channels_sent = [in_app] (email suppressed)           PASS
email sent w/ real Resend id to r1 + r3                  PASS
NO email to r2 (email pref off)                          PASS
RLS: r1 JWT sees ONLY r1's notification                  PASS
```

- Absent pref row = default (in_app=true, email=true) — only explicit overrides persisted.
- Engine writes `notifications` with the service-role client (RLS grants INSERT to service-role
  only) but STRICTLY one row per resolved recipient — never outside the audience.
- Email dedupe: `wasEmailSentRecently(to, template, 20h)` — same guard as the cron; no double-fire.
- Reads of a user's own notifications go through the user's RLS-scoped client (routes), proven by
  the RLS check (r1 sees only their row).
