-- Prompt 5a item 2: occasion_types config (seeded; tenants read, platform writes).
create table if not exists public.occasion_types (
  key              text primary key,
  label            text not null,
  category         text not null check (category in ('person','sensitive','company')),
  default_lead_days integer not null,
  default_budget   integer,
  is_sensitive     boolean not null default false,
  auto_generate    boolean not null default false,
  requires_consent boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.occasion_types is 'Seeded occasion config (§4A-4C). default_lead_days = days BEFORE the occasion date. Onboarding=5-before (kit on desk day one). Prompt 5a.';

drop trigger if exists trg_occasion_types_updated_at on public.occasion_types;
create trigger trg_occasion_types_updated_at before update on public.occasion_types for each row execute function public.set_updated_at();

-- §4A person auto-gen leads are SPEC-PINNED (14/14/30/5/7). §4B/§4C leads are provisional
-- (not numerically spec-pinned in this prompt) — see verify5a/2_occasion_types.md.
insert into public.occasion_types (key, label, category, default_lead_days, is_sensitive, auto_generate, requires_consent) values
  ('birthday','Birthday','person',14,false,true,false),
  ('work_anniversary','Work Anniversary','person',14,false,true,false),
  ('milestone_anniversary','Milestone Anniversary','person',30,false,true,false),
  ('onboarding','Onboarding (Day One)','person',5,false,true,false),
  ('probation_completion','Probation Completion','person',7,false,true,false),
  ('wedding','Wedding','sensitive',30,true,false,true),
  ('new_baby','New Baby / New Parent','sensitive',21,true,false,true),
  ('bereavement','Condolence / Bereavement','sensitive',2,true,false,true),
  ('get_well','Get Well Soon','sensitive',2,true,false,true),
  ('promotion','Promotion','company',7,false,false,false),
  ('spot_award','Spot Award','company',7,false,false,false),
  ('quarterly_mvp','Quarterly MVP','company',14,false,false,false),
  ('annual_award','Annual Award','company',21,false,false,false),
  ('company_anniversary','Company Anniversary','company',30,false,false,false),
  ('team_offsite','Team Offsite','company',21,false,false,false),
  ('client_appreciation','Client Appreciation','company',21,false,false,false),
  ('deal_closure','Deal Closure','company',7,false,false,false),
  ('farewell','Farewell','company',7,false,false,false),
  ('retirement','Retirement','company',21,false,false,false)
on conflict (key) do nothing;

alter table public.occasion_types enable row level security;
create policy occasion_types_read on public.occasion_types for select using (auth.role() = 'authenticated' or public.is_platform_staff());
create policy occasion_types_platform_write on public.occasion_types for all using (public.is_platform_staff()) with check (public.is_platform_staff());
create policy occasion_types_service on public.occasion_types for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
revoke all on public.occasion_types from anon;
