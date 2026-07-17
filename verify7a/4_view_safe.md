# Item 4 — Tenant quote view + PII-safe ops notification — PASS

Evidence: `4_view_safe_run.txt`.

```
company A sees exactly its 2 quotes (RLS)                        PASS
company B sees exactly its 1 quote (isolation)                   PASS
quote list carries status/occasion/total/created_at shape       PASS
ops notification TITLE has NO employee name (PII-safe)           PASS
ops notification BODY has NO employee name                       PASS
ops notification LINK (wa.me) has NO employee name/PII           PASS
ops email SUBJECT has NO employee name                           PASS
CONTROL: sentinel grep catches a leak                            PASS
```

- Tenant `dashboard/quotes` is now a REAL RLS-scoped list (`listCompanyQuotes` via the user client).
  Own-company only — proven with two companies + real JWTs.
- §10.13: the quote-request ops notification is built from ORG context only (org name, plan,
  occasion TYPE, item count, quote number) — the route never receives or passes an employee name.
  With a sentinel-named employee's occasion in scope, the notification title/body/link and the email
  subject contain ZERO sentinel; the control proves the grep detects a real leak. The wa.me link
  carries the client's business contact number (not employee PII).
