# Item 4 — Kill employees_safe + repoint PII off employees — PASS

## Snapshot + drop
- DDL snapshot committed: `supabase/snapshots/employees_safe_pre4a.sql` (the SECURITY
  DEFINER view exactly as it was on 76c7938).
- Migration `032_employees_pii_split_and_dept_fk`: `drop view if exists public.employees_safe`.
- Confirmed: `to_regclass('public.employees_safe')` = **null** (gone).

## Repoint employees SELECT RLS
- `employees_read_full` (which keyed on the text `department`) DROPPED; replaced by
  `employees_read`: `is_platform_staff() OR company_id IN (user_company_ids())` — i.e. the
  identity/work row is readable by ANY company member (what employees_safe gave finance/viewer).
  The manager-own-dept gate moved to `employee_pii` (keyed on department_id).
- employees policies now: `employees_read, employees_insert, employees_update, employees_delete, employees_service_role`.

## Reversible column renames (no drops; employees=0 rows)
The 7 PII columns moved out of employees via rename to `_deprecated_*`:
```
phone -> _deprecated_phone
delivery_address -> _deprecated_delivery_address
city -> _deprecated_city
pincode -> _deprecated_pincode
dob_day -> _deprecated_dob_day
dob_month -> _deprecated_dob_month
notes -> _deprecated_notes
```
(+ department and profile_notes — see items 5 / housekeeping.) Confirmed present:
`_deprecated_{city,delivery_address,department,dob_day,dob_month,notes,phone,pincode,profile_notes}`.

## Runtime code repointed off the view + old PII columns
- `src/lib/employees/queries.ts` — rewritten: identity on `employees`, PII on `employee_pii`
  (phone/delivery_address encrypted via pii-crypto; reads decrypt; §6A enforced by RLS →
  `pii=null` when not permitted). No PII columns read from `employees`.
- `src/lib/engines/occasions.ts` — dob now from `employee_pii` embed; department via FK embed.
- `src/lib/engines/recommendation.ts` — department_id instead of department text.
- `src/lib/authz/tenancy.test.ts` — pen-test updated to the split model (finance denied
  employee_pii, owner/hr allowed, manager own-dept only; identity all-member).
- `src/lib/types/database.ts` — `employees_safe` View entry removed.
- Doc comment in `src/lib/supabase/server.ts` updated to describe the split.
- grep: no runtime code references `employees_safe` or the old PII columns. tsc + build GREEN.
