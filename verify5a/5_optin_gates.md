# Item 5 — Festival opt-in canonicalization + plan gates — PASS

## Canonicalization
- `company_festivals` (the table wired in occasions.ts) is the CANONICAL per-org festival opt-in.
- `companies.observed_festivals[]` (unused) reversibly deprecated → renamed
  `_deprecated_observed_festivals` (migration 037).

## Plan gates (extended `src/lib/employees/plan-gate.ts`)
- `canUseDepartments(ctx)` — Pro-only (departments & managers, §8).
- `canUseApprovals(ctx)` — Pro-only (approval workflows, §8).
- `festivalLimit(ctx)` — Free = 3 festivals, Pro/override/platform = unlimited (§8).
- New reason codes + `gateMessage()` entries. Same stub pattern as 4b's `canImport`; seam for Prompt 8.

## Acceptance (`_acceptance_run.txt`) — PASS
```
_deprecated_observed_festivals exists          PASS
observed_festivals removed                     PASS
company_festivals opt-in insert works (canonical)   PASS
festivalLimit: Free = 3                         PASS
festivalLimit: Pro = unlimited                  PASS
```

Note: the Free=3 festival cap is defined (`festivalLimit`) and ready to enforce at the opt-in
write path; wiring the enforcement into the festival opt-in UI/route is a small follow-on (the
opt-in mechanism itself is `company_festivals`, unchanged).
