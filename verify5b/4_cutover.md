# Item 4 — Reminders becomes a downstream consumer of occasions — PASS

`occasions.generateReminders` was rewritten: it no longer recomputes occasions on the fly
(`getUpcomingEvents` + [7,3,1,0] offsets). It now READS `occasions.notify_date` and writes one
reminder per occasion at its lead-adjusted notify_date. Callers run `generateOccasions` first:
- `/api/reminders/cron`: `generateOccasions(company)` → `generateReminders(company)` per company, then the SAME email path (`resolveCompanyRecipients` + `sendOccasionReminderEmail`).
- dashboard load: same order.

Acceptance (`_cutover_cap.ts`, run `_cutover_cap_run.txt`):
```
occasion generated with notify_date = today                              PASS
reminder row DERIVED FROM occasion (reminder_date=today, occasion-sourced) PASS
email path fires from occasion-sourced reminder (real Resend id 773e93aa-2fd9-46c8-93bb-95f9ebde7e90)  PASS
email_log records the occasion_reminder send (status=sent)                PASS
no double-fire: exactly one reminder for the due occasion                 PASS
```
The email path is preserved (real Resend send + email_log), now SOURCED from occasions instances.
No double-fire: reminders derive solely from occasions (one row per occasion at notify_date); the
on-the-fly recompute is gone.

NOTE (behavior change, intended): the old engine emitted a 4-reminder ladder [7,3,1,0] days before
each occasion; the new model emits ONE reminder at the per-type lead-adjusted notify_date. This is
the §4 lead-time model. The digest (`getUpcomingEvents`) remains a read-only preview (no double-fire).
