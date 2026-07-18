-- Prompt P9d (R3): persistent kit. Net-new `kit_items` table (the legacy migration-001 kits/kit_items
-- org_id tables were dropped long ago — greenfield, no name collision). Additive only.
--
-- OWNERSHIP (ruled): a kit belongs to a USER, scoped to their company — keyed (company_id, user_id,
-- product_id). RLS scopes every row to auth.uid() within their company, so one user's kit is invisible
-- to other users in the same org. Branding/demo/festival work is untouched (branding columns already
-- exist on companies from prior phases; this migration adds NO branding schema).

create table if not exists public.kit_items (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  product_id   text not null,           -- catalog product id (static catalog, not a table FK)
  sku          text not null,
  name         text not null,
  unit_price   numeric,
  quantity     integer not null default 1 check (quantity > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (company_id, user_id, product_id)
);

create index if not exists kit_items_owner_idx on public.kit_items(company_id, user_id);

alter table public.kit_items enable row level security;

-- The kit is the user's own, within their company. auth.uid() == user_id AND the company is theirs.
create policy kit_items_owner_all on public.kit_items
  for all
  using (user_id = auth.uid() and company_id in (select public.user_company_ids()))
  with check (user_id = auth.uid() and company_id in (select public.user_company_ids()));

-- Service role (server engines) full access.
create policy kit_items_service_role on public.kit_items
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

revoke all on public.kit_items from anon;

-- updated_at maintenance (reuse the shared trigger fn).
drop trigger if exists trg_kit_items_updated_at on public.kit_items;
create trigger trg_kit_items_updated_at before update on public.kit_items
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
