# Item 2 — Tenant quote-request (matrix gate + engine + RLS) — PASS

Evidence: `2_quote_request_run.txt`.

```
matrix quote.request (§6A): hr/org_owner/org_admin/manager ALLOWED   PASS
matrix quote.request: finance DENIED, viewer DENIED                  PASS
quote created (company-scoped, requested_by, status 'draft')         PASS
quote row: company_id=A, created_by=hrA, occasion_key null (ad-hoc)  PASS
company A hr SEES the quote (RLS)                                     PASS
company B hr does NOT see it (RLS isolation)                         PASS
```

- Route `POST /api/quotes/request` is gated by `requireTenant("quote.request")` — the TENANT matrix
  capability (§6A: hr/org_admin/org_owner/manager Y; finance/viewer N). The existing OPS quote
  routes stay `requirePlatform`-gated (untouched).
- `requestQuote()` inserts a company-scoped quote (RLS WITH CHECK: `company_id ∈ user_company_ids()`),
  attributed to `created_by`, status `draft` (no `requested` enum value — not invented), with the
  stable `occasion_key` when occasion-linked.
- RLS isolation proven with two companies + real user JWTs: each sees only its own quotes.
- The route fires a PII-safe ops notification (see item 4).
