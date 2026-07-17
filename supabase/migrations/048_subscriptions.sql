-- Prompt 8a: Razorpay subscription activation + the webhook integrity boundary.
--
-- subscriptions: one row per company Pro subscription. Activated ONLY by a signature-verified
-- webhook (never a client claim). razorpay_events: the process-once idempotency guard keyed on
-- Razorpay's unique event id (X-Razorpay-Event-Id header) — a re-delivered/concurrent event
-- inserts once (unique PK) so it can never double-activate.

create table if not exists public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  company_id               uuid not null references public.companies(id) on delete cascade,
  plan                     text not null default 'pro',
  amount                   integer not null,            -- charged amount in paise (test-mode)
  currency                 text not null default 'INR',
  interval                 text not null default 'annual',
  razorpay_order_id        text,
  razorpay_subscription_id text,
  razorpay_payment_id      text,
  status                   text not null default 'created'
                             check (status in ('created','active','past_due','halted','cancelled')),
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  created_by               uuid references auth.users(id),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists subscriptions_company_idx on public.subscriptions(company_id, created_at desc);
create index if not exists subscriptions_rzp_order_idx on public.subscriptions(razorpay_order_id) where razorpay_order_id is not null;
-- At most one ACTIVE subscription per company (guards double-activation at the data layer).
create unique index if not exists subscriptions_one_active_per_company on public.subscriptions(company_id) where status = 'active';

-- Idempotency guard: exactly-once webhook processing keyed on Razorpay's event id.
create table if not exists public.razorpay_events (
  event_id    text primary key,
  event_type  text,
  received_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
alter table public.razorpay_events enable row level security;

-- subscriptions: own-company members + platform read; tenant may create a 'created' row (checkout);
-- activation (status->active) is service-role only (webhook) — tenants cannot flip to active.
drop policy if exists subscriptions_read on public.subscriptions;
create policy subscriptions_read on public.subscriptions
  for select using (company_id in (select user_company_ids()) or is_platform_staff());
drop policy if exists subscriptions_insert on public.subscriptions;
create policy subscriptions_insert on public.subscriptions
  for insert with check (company_id in (select user_company_ids()));
drop policy if exists subscriptions_update on public.subscriptions;
create policy subscriptions_update on public.subscriptions
  for update using (is_platform_staff());

-- razorpay_events: platform read only; writes are service-role (webhook) which bypasses RLS.
drop policy if exists razorpay_events_read on public.razorpay_events;
create policy razorpay_events_read on public.razorpay_events
  for select using (is_platform_staff());

notify pgrst, 'reload schema';
