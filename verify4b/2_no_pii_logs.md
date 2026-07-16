# Item 2 — PII-NEVER-LOGGED (adversarial, §10.12-13) — PASS (compliance gate)

## Design
- `validateCSVRows` emits BY-REFERENCE issues `{field, code}` — the offending value stays only
  in `row.data` (client preview) and never enters an error/log/report.
- `downloadErrorReport` emits `row,field,code` columns (no values).
- `bulkCreateEmployees` returns `{row, field, code}` errors; a DB insert error maps to
  `{row, field:"_batch", code:"insert_failed"}` — the raw DB message (which can echo a value,
  e.g. a duplicate email) is NEVER surfaced.
- Route catch blocks log a static tag only (`console.error("[employees/upload]")`) — never `err`.
- No Sentry/tracing is installed (no external PII sink).

## Acceptance (script `_no_pii_logs.ts`, run `_no_pii_logs_run.txt`) — PASS
Fed adversarial rows through the REAL parse+validate pipeline (`parseCsvText` → `validateCSVRows`)
carrying UNIQUE sentinel PII (phone/address/name/dob/email): bad email, 5000-char address,
formula-injection strings (`=cmd|…`, `=HYPERLINK(…)`), missing required fields, invalid enums/dates.
Captured all console output + the error-report CSV + the returned errors payload + structured
results, then grepped every surface for the sentinels:
```
produced by-reference errors (row/field/code)                       PASS
ZERO PII sentinels in errors/report/logs (hits=0)                   PASS
control: sentinels present in row.data (a leak WOULD be detected)   PASS
```
The error report is by-reference (e.g. `2,email,invalid_email`), NO value anywhere. The control
proves the grep is real (sentinels DO exist in the parsed data, so any echo would be caught).

**§10 compliance gate PASSED — zero PII in any log/error/report surface.**
