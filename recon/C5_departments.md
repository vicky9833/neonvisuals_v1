# C5 — DEPARTMENT REALITY

## Does `employees.department_id` exist?
**NO.** The `employees` table has **no `department_id` column**. Department scoping today
is **pure text-match**.

- The text column is **`employees.department` (text, nullable)**.
- The manager RLS branch in `employees_read_full` matches this text against the
  `departments` table by NAME:
  ```sql
  has_company_role(company_id, ARRAY['manager']) AND
  department = (SELECT d.name FROM departments d WHERE d.id = user_department_id(d.company_id))
  ```
  i.e. it text-compares `employees.department` to the `departments.name` of the manager's
  own department. A `departments` table exists (from Prompt 1) and is the canonical dept
  registry; `company_members.department_id` links a member to a department.

## Per-company distinct department text values
- `employees` has **0 rows**, so there are **0 distinct `department` text values** in any
  company today.
- `departments` table has **0 rows** as well.

## Feasibility of the FK backfill (`department_id`)
**Trivial today, precisely because there is no data yet.** With 0 employee rows and 0
department rows, adding `employees.department_id uuid REFERENCES departments(id)` and
backfilling by text-name match is a clean, zero-risk migration — there are no existing
mismatches to reconcile. The risk is entirely forward-looking: once employees are imported
via CSV (which sets the free-text `department`), name normalization (case/whitespace/synonyms)
between `employees.department` and `departments.name` must be handled or the FK backfill
will orphan rows.

## Headline
Scoping is text-match on `employees.department` (no `department_id` FK exists). Both
`employees` and `departments` are empty, so introducing the FK now is trivial and safe;
the only future concern is text→FK normalization at CSV-import time.
