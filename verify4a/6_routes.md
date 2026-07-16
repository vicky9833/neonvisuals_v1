# Item 6 — Employee routes under the capability matrix (Decision C) — PASS

Employee routes now gate via `authorize()` (capability matrix) instead of RLS-only,
consistent with the 3b team routes. RLS remains the backstop.

| Route | Method | Capability | §6A rule |
|-------|--------|-----------|----------|
| /api/employees | POST (create) | `employees.edit` (resourceDept = body.department_id) | owner/admin/hr; manager own-dept |
| /api/employees | GET (list) | baseline member (identity only; no PII) | any member (employees_read RLS) |
| /api/employees/[id] | GET | identity always; PII attached iff `employees.view_pii` (own-dept for manager), else stripped | owner/admin/hr + manager-own-dept |
| /api/employees/[id] | PATCH / DELETE | `employees.edit` (resourceDept = employee.department_id) | owner/admin/hr; manager own-dept |
| /api/employees/bulk | POST | `employees.bulk_import` | owner/admin/hr (Pro gate = 4b) |

Added `tenantCapability(principal, capability, companyId?, resourceCtx?)` to `api-auth.ts`
(non-throwing decision) so GET [id] can attach-or-strip PII rather than 403.

## Matrix realignment (STOP-flagged)
`TENANT_MATRIX["employees.view_pii"]` manager cell was **"N"** (hard deny), contradicting the
prompt's item-3/item-6 §6A ("manager own-dept sees PII"; "outside-dept-manager fail"). Realigned
manager → **"own-dept"** so the matrix, the employee_pii RLS, and the prompt agree. **This is an
auth-rule change to a matrix previously marked "verbatim from spec" — please confirm on promote,
or if manager must NOT see PII I will revert the cell AND drop the manager clause from
`can_read_employee_pii`.**

## Acceptance (authorize() decisions, `_rls_acceptance_run.txt`) — PASS
```
view_pii: owner allow · org_admin allow · hr allow · finance DENY · viewer DENY
view_pii: manager own-dept allow · manager other-dept DENY
edit: hr allow · viewer DENY
bulk_import: hr allow · manager DENY · viewer DENY
```
(Route-level gate = the same authorize() the routes call via tenantCapability/requireTenant;
the employee_pii RLS in item 3 is the DB backstop. No dev-server/deploy in 4a — hold for promote.)
