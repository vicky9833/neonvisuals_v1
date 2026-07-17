-- Prompt 7c-rest: proof-photo storage (the §10 persist path) + before-dispatch flag.
--
-- order_proof_photos: one row per stored proof image. Storage path holds NO employee PII
-- ({company_id}/{order_id}/{uuid}.{ext}). Ops upload via service-role; tenants read (RLS
-- own-company) and view via short-TTL signed URLs generated server-side (never public URLs).
-- proof_photos_ready: SOFT before-dispatch flag — set when ops marks photos ready (fires the §7
-- hr/org_admin notification). It does NOT hard-block the shipped transition (ruling: transparency,
-- not a mandatory approval gate); a per-org hard review gate is a future setting.

create table if not exists public.order_proof_photos (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  storage_path  text not null,
  content_type  text not null,
  size_bytes    integer not null,
  uploaded_by   uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create index if not exists order_proof_photos_order_idx on public.order_proof_photos(order_id);
create index if not exists order_proof_photos_company_idx on public.order_proof_photos(company_id);

alter table public.order_proof_photos enable row level security;

-- Read: company members (own-company) + platform staff. Tenants read metadata; the bytes are only
-- reachable via server-generated signed URLs.
drop policy if exists order_proof_photos_read on public.order_proof_photos;
create policy order_proof_photos_read on public.order_proof_photos
  for select using (company_id in (select user_company_ids()) or is_platform_staff());

-- Write: platform staff ONLY (ops uploads proof photos, §6B). Tenants cannot write. Service-role
-- (the ops upload path) bypasses RLS; this policy is the defence-in-depth for the RLS user client.
drop policy if exists order_proof_photos_write on public.order_proof_photos;
create policy order_proof_photos_write on public.order_proof_photos
  for all using (is_platform_staff()) with check (is_platform_staff());

alter table public.orders add column if not exists proof_photos_ready boolean not null default false;

-- PRIVATE storage bucket for proof photos (never public). All access = service-role upload +
-- short-TTL signed URLs for tenant viewing.
insert into storage.buckets (id, name, public)
values ('order-proofs', 'order-proofs', false)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
