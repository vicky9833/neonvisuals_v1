# Item 5 — department text → FK retirement (Decision D) — PASS

- The text `department` column on employees RENAMED to `_deprecated_department` (reversible).
  departments=0 and employees=0 rows → no backfill needed.
- RLS + reads now key on `department_id` (FK → departments, ON DELETE SET NULL):
  - `employee_pii` §6A manager gate: `can_read_employee_pii` joins `employees.department_id
    = user_department_id(company)` (proven in item 3: manager sees own-dept PII only).
  - `employees_read` no longer references department at all (all-member identity read).
  - Reads expose the department NAME via the `departments` FK embed (`department:departments(name)`),
    which is member-readable (departments_read policy).
- Code: `queries.ts`, `occasions.ts`, `recommendation.ts` repointed to `department_id` (+ FK
  embed for the name). `Employee`/`EmployeeFormData` gained `department_id`.
- tsc `--noEmit` exit 0; `npm run build` GREEN.

**Flagged (Prompt 5):** resolving a free-text department NAME on employee create/import to a
`department_id` requires departments CRUD (Prompt 5). Until then, create/import do NOT persist
a department (department_id stays null unless an explicit id is supplied). Department name is
read-only via the FK embed.
