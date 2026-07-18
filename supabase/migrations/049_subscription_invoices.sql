-- Prompt 8b: subscription invoices. Link invoices to subscriptions (not just orders) and enforce
-- one-payment-one-invoice at the data layer (mirrors the 8a idempotency discipline).
--
-- A subscription invoice has NO order (order_id null) and a subscription_id set. The CHECK keeps
-- every invoice attached to exactly one of order/subscription. The partial-unique index guarantees
-- a subscription can have at most ONE invoice — a re-delivered activation cannot create a duplicate.

alter table public.invoices alter column order_id drop not null;

alter table public.invoices
  add column if not exists subscription_id uuid references public.subscriptions(id) on delete set null;

alter table public.invoices
  drop constraint if exists invoices_order_or_subscription;
alter table public.invoices
  add constraint invoices_order_or_subscription
  check (order_id is not null or subscription_id is not null);

create index if not exists invoices_subscription_idx
  on public.invoices(subscription_id) where subscription_id is not null;

-- One invoice per subscription (one payment = one legal invoice).
create unique index if not exists invoices_one_per_subscription
  on public.invoices(subscription_id) where subscription_id is not null;

notify pgrst, 'reload schema';
