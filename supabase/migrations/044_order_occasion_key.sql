-- Prompt 7c-i: order lifecycle → gift-history stable occasion key + status hardening.
--
-- DECISION (7c-i, ruling 1): the canonical order lifecycle is the REAL 9-state app union
-- (draft, confirmed, in_production, quality_check, packed, shipped, delivered, completed,
-- cancelled) enforced by src/lib/engines/order-constants.ts `canTransition`. The dormant
-- `order_status` ENUM TYPE (pending/confirmed/.../packing/dispatched/completed) is UNUSED by the
-- `orders.status` TEXT column and is intentionally left untouched. §5's draft→...→delivered is a
-- documented subset; the implemented 9-state lifecycle is canonical (spec-reconciliation).
--
-- STABLE occasion key (7a pattern — NOT occasions.id, NOT a festival_id FK which is a hard P9
-- prerequisite). `gift_records.occasion_key` answers "what did we give Priya AND for which
-- occasion"; `orders.occasion_key` carries the quote's stable key onto the order so the
-- ->delivered gift-history write joins order↔quote↔occasion by a stable string that survives
-- occasion regeneration. All additive, nullable; no drops.

alter table public.orders add column if not exists occasion_key text;
alter table public.gift_records add column if not exists occasion_key text;

create index if not exists orders_occasion_key_idx on public.orders(occasion_key) where occasion_key is not null;
create index if not exists gift_records_occasion_key_idx on public.gift_records(occasion_key) where occasion_key is not null;

-- Harden the status VALUE domain to the canonical 9-state union (transition ENFORCEMENT stays in
-- the engine `canTransition`; this CHECK only bars impossible status values at the DB). Safe: the
-- orders table currently has 0 rows. NOT VALID would be unnecessary at 0 rows.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_status_canonical_check'
  ) then
    alter table public.orders
      add constraint orders_status_canonical_check
      check (status in ('draft','confirmed','in_production','quality_check','packed','shipped','delivered','completed','cancelled'));
  end if;
end $$;

notify pgrst, 'reload schema';
