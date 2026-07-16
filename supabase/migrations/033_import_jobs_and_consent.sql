-- Prompt 4b item 4: make employee_pii.consent_status canonical + constrained.
-- Decision F: {company_asserted, employee_confirmed, withdrawn}. Default already company_asserted.
alter table public.employee_pii
  add constraint employee_pii_consent_status_check
  check (consent_status in ('company_asserted','employee_confirmed','withdrawn'));

-- Retire the now-duplicate employees.consent_status (canonical home is employee_pii).
alter table public.employees rename column consent_status to _deprecated_consent_status;

-- Prompt 4b item 3: import_jobs — import run metadata. errors_json is BY-REFERENCE
-- ([{row, field, code}]) and MUST NEVER contain a PII value (§10.12-13). No raw filename
-- stored (only source + byte size) to keep even file names out of persisted metadata.
create table if not exists public.import_jobs (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  created_by   uuid references auth.users(id),
  source       text not null default 'csv' check (source in ('csv','xlsx','json')),
  file_size    integer,
  rows_total   integer not null default 0,
  rows_ok      integer not null default 0,
  rows_failed  integer not null default 0,
  errors_json  jsonb not null default '[]'::jsonb,
  status       text not null default 'completed' check (status in ('completed','partial','failed')),
  created_at   timestamptz not null default now()
);
create index if not exists import_jobs_company_id_idx on public.import_jobs(company_id, created_at desc);
comment on table public.import_jobs is 'Employee import run metadata. errors_json is by-reference [{row,field,code}] — NEVER contains PII values (Prompt 4b, §10).';

alter table public.import_jobs enable row level security;

-- Read: import actors (owner/admin/hr) + platform staff. Insert: owner/admin/hr.
create policy import_jobs_read on public.import_jobs
  for select using (
    public.is_platform_staff()
    or (company_id in (select public.user_company_ids())
        and public.has_company_role(company_id, array['org_owner','org_admin','hr']::public.company_role[]))
  );
create policy import_jobs_insert on public.import_jobs
  for insert with check (
    company_id in (select public.user_company_ids())
    and public.has_company_role(company_id, array['org_owner','org_admin','hr']::public.company_role[])
  );
create policy import_jobs_service_role on public.import_jobs
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

revoke all on public.import_jobs from anon;
