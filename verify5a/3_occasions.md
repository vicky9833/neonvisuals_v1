# Item 3 — occasions instance table + RLS — PASS

Table `occasions` (migration 036): company_id, employee_id (nullable = company-wide),
occasion_type_key (FK occasion_types), title, date (nullable), **recur_month/recur_day**
(year-agnostic birthday anchor), lead_days, recurrence ∈ {none,annual}, is_company_wide, budget,
status ∈ {upcoming,notified,actioned,skipped,completed}, auto_generated, is_sensitive, timestamps.
No instances generated here (that's 5b) — table + RLS only.

## §6A RLS (SECURITY DEFINER helpers can_read_occasion / can_write_occasion)
- Read: company-wide visible to all members; person occasions to owner/admin/hr/finance/viewer,
  and to managers ONLY for their own department (via employees.department_id); platform staff all.
- Write: owner/admin/hr, or manager for own-dept person occasions.

## Acceptance (real JWT sessions, `_acceptance_run.txt`) — PASS
```
owner(A) sees all 3 A occasions                         PASS
owner(A) does NOT see B occasion (company isolation)     PASS
manager(Eng) sees company-wide + eng bday               PASS
manager(Eng) does NOT see design bday (own-dept)         PASS
manager(Design) sees design bday, NOT eng bday           PASS
viewer(A) sees person occasions (dashboards.view)        PASS
ownerB isolation: sees only B                            PASS
year-agnostic birthday: recur_month/day set, date null, recurrence=annual   PASS
```
Company isolation + §6A own-dept manager scoping proven at the user-JWT layer. Year-less birthday
recurrence modelled via recur_month/recur_day (no birth year). All t5a_ rows cleaned; zero residue.

Note: multi-row inserts must set every varying NOT-NULL column per row (PostgREST sets omitted
present-columns to NULL, bypassing defaults) — the 5b engine writes rows one-shape-at-a-time.
