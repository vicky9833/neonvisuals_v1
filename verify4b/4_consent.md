# Item 4 — Consent-on-import — PASS

- `employee_pii.consent_status` is the CANONICAL column, default `company_asserted` (DPA model:
  the company attests authority). Import/create leave the default; no value is required from the file.
- CHECK constraint (Decision F): `{company_asserted, employee_confirmed, withdrawn}` (migration 033).
- The duplicate `employees.consent_status` is RETIRED → renamed `_deprecated_consent_status`.

## Acceptance (script `_gates.ts`, run `_gates_run.txt`) — PASS
```
default consent_status = company_asserted                           PASS
accepts employee_confirmed                                          PASS
accepts withdrawn                                                   PASS
CHECK rejects invalid consent_status                                PASS
employees._deprecated_consent_status exists (duplicate retired)     PASS
employees.consent_status no longer present                          PASS
```
