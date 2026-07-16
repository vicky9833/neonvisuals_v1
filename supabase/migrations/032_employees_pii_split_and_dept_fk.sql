-- Prompt 4a items 4 + 5: kill employees_safe, repoint employees SELECT RLS, move PII
-- columns + text department out of employees via REVERSIBLE rename to _deprecated_*.
-- employees = 0 rows -> no data moves. DDL snapshot: supabase/snapshots/employees_safe_pre4a.sql

-- (1) Drop the SECURITY DEFINER leak view (snapshotted; no data).
drop view if exists public.employees_safe;

-- (2) Repoint employees base-table SELECT. PII now lives in employee_pii behind
-- §6A; the identity/work row on employees is readable by ANY company member
-- (this is what employees_safe used to provide to finance/viewer) + platform staff.
-- The manager-own-dept gate moved to employee_pii (can_read_employee_pii, keyed on
-- department_id). This removes the last reference to the text `department` column.
drop policy if exists employees_read_full on public.employees;
create policy employees_read on public.employees
  for select using (
    public.is_platform_staff()
    or (company_id in (select public.user_company_ids()))
  );

-- (3) Reversible rename: move the 7 PII columns + text department out of employees.
-- Writes/reads now go through employee_pii. Originals preserved as _deprecated_*.
alter table public.employees rename column phone to _deprecated_phone;
alter table public.employees rename column delivery_address to _deprecated_delivery_address;
alter table public.employees rename column city to _deprecated_city;
alter table public.employees rename column pincode to _deprecated_pincode;
alter table public.employees rename column dob_day to _deprecated_dob_day;
alter table public.employees rename column dob_month to _deprecated_dob_month;
alter table public.employees rename column notes to _deprecated_notes;
alter table public.employees rename column department to _deprecated_department;

-- Housekeeping (Decision I): the second, unused notes column folds into the single
-- employee_pii.notes home; deprecate it too so there is one notes column of record.
alter table public.employees rename column profile_notes to _deprecated_profile_notes;

-- Housekeeping (Decision I): employees had TWO identical updated_at triggers firing
-- set_updated_at(); drop the older duplicate, keep trg_employees_updated_at.
drop trigger if exists employees_updated_at on public.employees;
