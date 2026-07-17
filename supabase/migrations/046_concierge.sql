-- Prompt 7d: Concierge widget + ops inbox + threaded replies (§4G/§6C). Closes Prompt 7.
--
-- Three tables (thread is a SEPARATE table, not a thread[] array — per-message author/type/time,
-- RLS per message). Attachments are TENANT-uploaded (widest upload threat surface): images + PDF
-- ONLY, content-validated (magic bytes) at the route; private bucket; scoped signed URLs.

create table if not exists public.concierge_requests (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  raised_by         uuid not null references auth.users(id),
  subject           text not null,
  body              text not null,
  urgency           text not null default 'normal' check (urgency in ('low','normal','high')),
  status            text not null default 'open' check (status in ('open','awaiting_ops','awaiting_customer','resolved','closed')),
  assigned_staff_id uuid references auth.users(id),   -- Pro: dedicated ops assignee; Free: null (shared queue)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists concierge_requests_company_idx on public.concierge_requests(company_id, created_at desc);
create index if not exists concierge_requests_status_idx on public.concierge_requests(status);

create table if not exists public.concierge_messages (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null references public.concierge_requests(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id),
  sender_type    text not null check (sender_type in ('tenant','platform')),
  body           text not null,
  created_at     timestamptz not null default now()
);
create index if not exists concierge_messages_request_idx on public.concierge_messages(request_id, created_at);

create table if not exists public.concierge_attachments (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.concierge_requests(id) on delete cascade,
  company_id   uuid not null references public.companies(id) on delete cascade,
  storage_path text not null,
  content_type text not null,
  size_bytes   integer not null,
  uploaded_by  uuid references auth.users(id),
  created_at   timestamptz not null default now()
);
create index if not exists concierge_attachments_request_idx on public.concierge_attachments(request_id);

-- RLS: the requesting COMPANY's members (own-company) + platform staff (cross-org queue).
alter table public.concierge_requests enable row level security;
alter table public.concierge_messages enable row level security;
alter table public.concierge_attachments enable row level security;

drop policy if exists concierge_requests_read on public.concierge_requests;
create policy concierge_requests_read on public.concierge_requests
  for select using (company_id in (select user_company_ids()) or is_platform_staff());
drop policy if exists concierge_requests_insert on public.concierge_requests;
create policy concierge_requests_insert on public.concierge_requests
  for insert with check (company_id in (select user_company_ids()));
drop policy if exists concierge_requests_update on public.concierge_requests;
create policy concierge_requests_update on public.concierge_requests
  for update using (company_id in (select user_company_ids()) or is_platform_staff());

drop policy if exists concierge_messages_read on public.concierge_messages;
create policy concierge_messages_read on public.concierge_messages
  for select using (
    request_id in (select id from public.concierge_requests where company_id in (select user_company_ids()))
    or is_platform_staff()
  );
drop policy if exists concierge_messages_insert on public.concierge_messages;
create policy concierge_messages_insert on public.concierge_messages
  for insert with check (
    request_id in (select id from public.concierge_requests where company_id in (select user_company_ids()))
    or is_platform_staff()
  );

drop policy if exists concierge_attachments_read on public.concierge_attachments;
create policy concierge_attachments_read on public.concierge_attachments
  for select using (company_id in (select user_company_ids()) or is_platform_staff());
drop policy if exists concierge_attachments_write on public.concierge_attachments;
create policy concierge_attachments_write on public.concierge_attachments
  for all using (company_id in (select user_company_ids()) or is_platform_staff())
  with check (company_id in (select user_company_ids()) or is_platform_staff());

-- PRIVATE bucket for tenant-uploaded concierge attachments (images + PDF only, enforced at route).
insert into storage.buckets (id, name, public)
values ('concierge-attachments', 'concierge-attachments', false)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
