-- Prompt 5b: occasions gains notify_date (lead-adjusted) + is_rush; occasion_types gains
-- 'festival' + 'custom' keys (so festival/custom occasions have a valid FK); minimal platform
-- blackout store (§4H production/delivery blackout — the sanctioned 'add a minimal one').
alter table public.occasions add column if not exists notify_date date;
alter table public.occasions add column if not exists is_rush boolean not null default false;

insert into public.occasion_types (key, label, category, default_lead_days, is_sensitive, auto_generate, requires_consent, lead_days_source) values
  ('festival','Festival','company',30,false,false,false,'spec'),
  ('custom','Custom Occasion','company',14,false,false,false,'provisional')
on conflict (key) do nothing;

create table if not exists public.platform_blackout_dates (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  kind       text not null default 'production' check (kind in ('production','delivery')),
  note       text,
  created_at timestamptz not null default now(),
  unique (date, kind)
);
comment on table public.platform_blackout_dates is 'Platform-level production/delivery blackout dates (§4H). Lead-time engine skips these. Prompt 5b.';
alter table public.platform_blackout_dates enable row level security;
create policy platform_blackout_read on public.platform_blackout_dates for select using (auth.role() = 'authenticated' or public.is_platform_staff());
create policy platform_blackout_write on public.platform_blackout_dates for all using (public.is_platform_staff()) with check (public.is_platform_staff());
create policy platform_blackout_service on public.platform_blackout_dates for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
revoke all on public.platform_blackout_dates from anon;
