# Item 5 — §10.13 adversarial PII safety — PASS (compliance gate)

An employee with SENTINEL PII (`Zzsentinelfirst Zzsentinellast`, phone `9111100077`) flows through
the occasion + membership triggers. The occasion's `title` deliberately CONTAINS the sentinel name
(the real leak vector). Evidence: `5_pii_run.txt`.

```
NO sentinel in any notification TITLE                    PASS   titles are reference-style ("Upcoming birthday in 14 days", etc.)
NO sentinel in any notification LINK (URL/log surface)   PASS
NO sentinel in any email SUBJECT                         PASS   ("Upcoming gifting moment this week")
NO sentinel in logged email metadata                     PASS
platform notification fully PII-free (title+body+link)   PASS
tenant BODY names the person (authorised, RLS)           PASS   (grep target present -> title-cleanliness is non-vacuous)
CONTROL: grep catches a deliberately-leaked title        PASS
```

Design that upholds the gate:
- Notification TITLES + email SUBJECTS are reference-style (occasion TYPE + timing, or "Team role
  updated") — the employee name is NEVER placed there.
- The employee name lives ONLY in the in-app tenant BODY, shown to authorised PII viewers
  (hr/org_admin/org_owner/dept-manager) via RLS — not a subject/URL/log surface.
- PLATFORM notifications (ops) carry org/business-contact context only — no employee name/dob/phone
  in title, body, or the wa.me link.

**Item 5 PASSED — no employee PII in any subject, title, link, or logged metadata.**
