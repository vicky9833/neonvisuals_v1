# Item 5 — Pro-tier gate stub (Decision H) — PASS

`src/lib/employees/plan-gate.ts` — pure, unit-testable, with a clear seam for Prompt 8 billing:
- `canImport(ctx)` — CSV/XLSX import is Pro-only. Free → deny (`free_plan_import_blocked`);
  Pro plan → allow; `plan_override_by` set → allow; platform staff → allow (`platform_bypass`).
- `canManualAdd(ctx)` — Free tier allowed up to `employee_limit` (5); at cap → deny
  (`free_cap_reached`); Pro/override/platform → uncapped.
- `PRO_PLANS = {pro, scale, enterprise}` (Prompt 8 owns the real taxonomy).
- Reasons are machine codes (never user values). Reads only `companies.plan` /
  `plan_status` / `plan_override_by` / `employee_limit`. NO billing logic.

Wiring: `/api/employees/upload` + `/api/employees/bulk` call `canImport`; `POST /api/employees`
(manual add) calls `canManualAdd` before insert.

## Acceptance (`_gates.ts`, `_gates_run.txt`) — PASS
```
import: Free -> denied (free_plan_import_blocked)   PASS
import: Pro -> allowed                               PASS
import: override -> allowed                          PASS
import: platform staff -> allowed (bypass)           PASS
manual: Free under cap -> allowed                    PASS
manual: Free at cap -> denied (free_cap_reached)     PASS
manual: Pro over free cap -> allowed                 PASS
```
Stub only — no billing (Prompt 8 replaces the plan resolution).

## STOP-for-decision (plan taxonomy)
`PRO_PLANS = {pro, scale, enterprise}` and "Free = plan 'free'" are assumed (0 companies exist;
`plan` defaults to 'free'). Confirm the real plan names, or Prompt 8 defines them and swaps the seam.
