-- Prompt 5a item 3: occasions per-company instances (5b's engine writes these; 5a = table+RLS only).
-- Year-agnostic recurrence: birthdays carry recur_month/recur_day (NO birth year, P1 privacy).
create table if not exists public.occasions (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  employee_id       uuid references public.employees(id) on delete cascade,   -- null = company-wide
  occasion_type_key text not null references public.occasion_types(key),
  title             text not null,
  date              date,
  recur_month       smallint check (recur_month between 1 and 12),
  recur_day         smallint check (recur_day between 1 and 31),
  lead_days         integer not null default 14,
  recurrence        text not null default 'none' check (recurrence in ('none','annual')),
  is_company_wide   boolean not null default false,
  budget            integer,
  status            text not null default 'upcoming' check (status in ('upcoming','notified','actioned','skipped','completed')),
  auto_generated    boolean not null default false,
  is_sensitive      boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists occasions_company_idx on public.occasions(company_id, date);
create index if not exists occasions_employee_idx on public.occasions(employee_id);
comment on table public.occasions is 'Per-company occasion instances. Birthdays are year-agnostic (recur_month/recur_day; no birth year). Prompt 5a (table+RLS); 5b generates rows.';

drop trigger if exists trg_occasions_updated_at on public.occasions;
create trigger trg_occasions_updated_at before update on public.occasions for each row execute function public.set_updated_at();

create or replace function public.can_read_occasion(p_employee_id uuid, p_company_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_platform_staff() or (
    p_company_id in (select public.user_company_ids()) and (
      p_employee_id is null
      or public.has_company_role(p_company_id, array['org_owner','org_admin','hr','finance','viewer']::public.company_role[])
      or (public.has_company_role(p_company_id, array['manager']::public.company_role[])
          and exists (select 1 from public.employees e where e.id = p_employee_id and e.department_id is not null and e.department_id = public.user_department_id(p_company_id)))
    )
  );
$$;

create or replace function public.can_write_occasion(p_employee_id uuid, p_company_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_company_id in (select public.user_company_ids()) and (
    public.has_company_role(p_company_id, array['org_owner','org_admin','hr']::public.company_role[])
    or (p_employee_id is not null and public.has_company_role(p_company_id, array['manager']::public.company_role[])
        and exists (select 1 from public.employees e where e.id = p_employee_id and e.department_id is not null and e.department_id = public.user_department_id(p_company_id)))
  );
$$;

alter table public.occasions enable row level security;
create policy occasions_read on public.occasions for select using (public.can_read_occasion(employee_id, company_id));
create policy occasions_insert on public.occasions for insert with check (public.can_write_occasion(employee_id, company_id));
create policy occasions_update on public.occasions for update using (public.can_write_occasion(employee_id, company_id)) with check (public.can_write_occasion(employee_id, company_id));
create policy occasions_delete on public.occasions for delete using (public.can_write_occasion(employee_id, company_id));
create policy occasions_service on public.occasions for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
revoke all on public.occasions from anon;
