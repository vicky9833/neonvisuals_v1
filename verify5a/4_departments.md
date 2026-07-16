# Item 4 — Departments CRUD + assignment (activates 4a's inert own-dept RLS) — PASS

## Built
- Data layer `src/lib/departments/queries.ts`: list/create/update/delete + `syncManagerMembership`
  (assigning a manager sets `departments.manager_id` AND that manager's `company_members.department_id`
  = the dept — the own-dept RLS key).
- Routes: `/api/departments` (GET list, POST create), `/api/departments/[id]` (PATCH, DELETE).
  Gated by `requireTenant("settings.manage")` (owner/admin) + **Pro-gate** `canUseDepartments`.
- UI: `/dashboard/settings/departments` (`DepartmentsManager`): create, assign manager (dropdown),
  delete, employee counts; shows an upgrade notice on Free.
- Three linkages clarified: `departments.manager_id` (who manages), `company_members.department_id`
  (which dept a MEMBER belongs to — own-dept RLS key), `employees.department_id` (which dept an
  EMPLOYEE recipient is in; set via the existing employee PATCH).

## Acceptance (real JWT + pure gate, `_acceptance_run.txt`) — PASS
```
owner CAN create department (departments_manage)     PASS
viewer CANNOT create department (denied)              PASS
owner CAN update department                           PASS
owner CAN delete department                           PASS
canUseDepartments: Free denied / Pro allowed / platform bypass   PASS
manager(Eng) sees Eng employee PII (4a RLS now LIVE)  PASS
manager(Eng) does NOT see Design employee PII         PASS
```
**The headline**: with real department data (member.department_id + employee.department_id populated),
the manager-own-dept `employee_pii` RLS proven-but-inert in 4a is now **operative** — manager(Eng)
reads Eng employee PII and is denied Design employee PII. Non-owner/admin CRUD denied. t5a_ cleaned.

(Deployed route CRUD end-to-end lands in the push+smoke phase, per the established pattern.)
