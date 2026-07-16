# Item 6 — Offboarding action (Decision G; purge executor DEFERRED) — PASS

`POST /api/employees/[id]/offboard` (`offboardEmployee` in queries.ts):
- Gated by `employees.edit` (owner/admin/hr or manager-own-dept) via `tenantCapability` (403 on deny).
- Sets `offboarded_at = now()` and `is_active = false`. The existing `set_purge_after` trigger
  stamps `purge_after = offboarded_at + 90d`. Offboarded employees (is_active=false) drop out of
  active rosters and occasion generation (occasions.ts filters `is_active = true`).
- **Purge executor + anonymised-aggregate retention are NOT built** (deferred to a focused prompt —
  a destructive scheduled job on real PII gets its own build).

## "status=offboarded" interpretation (data-shape note)
There is no literal `status` column on employees (there never was — only `is_active` + `offboarded_at`
+ `purge_after`, and the trigger keys on `offboarded_at`). "Offboarded" is modelled as
`offboarded_at IS NOT NULL AND is_active = false`. No redundant column added. Flag if you want a
literal enum column instead.

## Acceptance (`_gates.ts`, `_gates_run.txt`) — PASS
```
offboard stamps purge_after = offboarded_at + 90d (trigger)   PASS
offboarded employee is_active=false                           PASS
offboarded employee excluded from active roster               PASS
non-edit role (viewer) denied employees.edit                  PASS
```
