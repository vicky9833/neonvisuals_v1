-- Prompt 6b: occasion_gift_state — a regen-surviving side table recording "a gift has been
-- chosen for this occasion", keyed on STABLE occasion identity (NOT the ephemeral occasions.id,
-- which is deleted+reinserted every cron run). This is the signal §7 escalation reads:
-- giftChosenFor(occasion) TRUE -> stages 2/3 suppressed. The REAL write comes from P7
-- (quote->order picks a gift); 6b proves the mechanism via synthetic gift-state.
--
-- Stable key uniqueness: (company, employee_id, type, date) is unique for EMPLOYEE occasions
-- (one birthday/anniversary/onboarding per employee per date). Company-WIDE festival/custom
-- occasions can share a date, so the computed stable_key appends the occasion title
-- (festival/custom name — NOT employee PII) for the company-wide case. We store the computed
-- key as a single UNIQUE text column (NULL-safe, unlike a multi-column unique with a nullable
-- employee_id where NULLs would be treated as distinct).
create table if not exists public.occasion_gift_state (
  id                uuid primary key default gen_random_uuid(),
  stable_key        text not null unique,
  company_id        uuid not null references public.companies(id) on delete cascade,
  employee_id       uuid references public.employees(id) on delete cascade,   -- null = company-wide
  occasion_type_key text not null,
  occasion_date     date not null,
  status            text not null default 'chosen'
                      check (status in ('chosen','ordered','cancelled')),
  gift_chosen_at    timestamptz not null default now(),
  chosen_by         uuid references auth.users(id),
  quote_id          uuid,   -- nullable now; P7 fills
  order_id          uuid,   -- nullable now; P7 fills
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists occasion_gift_state_company_idx on public.occasion_gift_state(company_id);
comment on table public.occasion_gift_state is 'Regen-surviving "gift chosen" signal per occasion (stable_key). Read by §7 escalation to suppress stages 2/3. Prompt 6b (mechanism); P7 wires the real write.';

drop trigger if exists trg_occasion_gift_state_updated_at on public.occasion_gift_state;
create trigger trg_occasion_gift_state_updated_at before update on public.occasion_gift_state
  for each row execute function public.set_updated_at();

alter table public.occasion_gift_state enable row level security;
-- Read: company members (own company) + platform staff.
create policy occasion_gift_state_read on public.occasion_gift_state for select
  using (public.is_platform_staff() or company_id in (select public.user_company_ids()));
-- Write: tenant owner/admin/hr (own company) — mirrors gift_records_rw.
create policy occasion_gift_state_rw on public.occasion_gift_state for all
  using (company_id in (select public.user_company_ids()) and public.has_company_role(company_id, array['org_owner','org_admin','hr']::public.company_role[]))
  with check (company_id in (select public.user_company_ids()) and public.has_company_role(company_id, array['org_owner','org_admin','hr']::public.company_role[]));
-- Service role (the engine / P7 write path).
create policy occasion_gift_state_service on public.occasion_gift_state for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
revoke all on public.occasion_gift_state from anon;

notify pgrst, 'reload schema';
