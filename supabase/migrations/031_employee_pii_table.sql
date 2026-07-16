-- Prompt 4a item 3: net-new employee_pii table (1:1 with employees).
-- phone/delivery_address are stored as app-encrypted AES-256-GCM envelopes
-- (the DB holds ciphertext it cannot decrypt). city/pincode/notes are plaintext
-- but RLS-gated per §6A, which CLOSES the old employees_safe leak (those were
-- previously visible to every company member). employees = 0 rows -> structure-only.
create table if not exists public.employee_pii (
  employee_id     uuid primary key references public.employees(id) on delete cascade,
  company_id      uuid not null references public.companies(id) on delete cascade,
  phone_enc       text,        -- AES-256-GCM envelope {v,iv,tag,ct}
  delivery_address_enc text,   -- AES-256-GCM envelope {v,iv,tag,ct}
  city            text,
  pincode         text,
  dob_day         smallint check (dob_day between 1 and 31),
  dob_month       smallint check (dob_month between 1 and 12),
  notes           text,
  consent_status  text not null default 'company_asserted',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists employee_pii_company_id_idx on public.employee_pii(company_id);

comment on table public.employee_pii is 'PII for employees (1:1). phone_enc/delivery_address_enc are app-layer AES-256-GCM envelopes; city/pincode/notes plaintext but RLS-gated (§6A). Prompt 4a.';

-- updated_at maintenance (reuse existing function).
drop trigger if exists trg_employee_pii_updated_at on public.employee_pii;
create trigger trg_employee_pii_updated_at before update on public.employee_pii
  for each row execute function public.set_updated_at();

-- §6A read gate: platform staff OR owner/admin/hr OR manager-of-employee's-department.
-- SECURITY DEFINER helper joins to employees.department_id (Decision D) and avoids
-- RLS recursion. Full-PII visibility rule lives in ONE place.
create or replace function public.can_read_employee_pii(p_employee_id uuid, p_company_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    public.is_platform_staff()
    or (
      p_company_id in (select public.user_company_ids())
      and (
        public.has_company_role(p_company_id, array['org_owner','org_admin','hr']::public.company_role[])
        or (
          public.has_company_role(p_company_id, array['manager']::public.company_role[])
          and exists (
            select 1 from public.employees e
            where e.id = p_employee_id
              and e.department_id is not null
              and e.department_id = public.user_department_id(p_company_id)
          )
        )
      )
    );
$$;

-- Write gate: member AND owner/admin/hr (mirrors employees_insert/update). Managers
-- may READ own-dept PII but never WRITE it.
create or replace function public.can_write_employee_pii(p_company_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_company_id in (select public.user_company_ids())
    and public.has_company_role(p_company_id, array['org_owner','org_admin','hr']::public.company_role[]);
$$;

alter table public.employee_pii enable row level security;

create policy employee_pii_read on public.employee_pii
  for select using (public.can_read_employee_pii(employee_id, company_id));

create policy employee_pii_insert on public.employee_pii
  for insert with check (public.can_write_employee_pii(company_id));

create policy employee_pii_update on public.employee_pii
  for update using (public.can_write_employee_pii(company_id))
  with check (public.can_write_employee_pii(company_id));

create policy employee_pii_delete on public.employee_pii
  for delete using (
    company_id in (select public.user_company_ids())
    and public.has_company_role(company_id, array['org_owner','org_admin']::public.company_role[])
  );

create policy employee_pii_service_role on public.employee_pii
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Defense-in-depth: anon has no business touching the PII table at all.
revoke all on public.employee_pii from anon;
