-- P10a — distributed rate-limit store (additive; no existing object touched).
--
-- Replaces the per-instance in-memory Map in /api/leads/capture with a SHARED, cross-instance
-- fixed-window counter so a limit actually holds across Vercel lambdas (and is enforced on the
-- public contact form + the Razorpay webhook too). Service-role only: RLS + REVOKE lock out
-- anon/authenticated entirely; the limiter runs server-side under the service role.
--
-- No capability rows here — the P10a §6B capabilities are TypeScript matrix entries
-- (src/lib/authz/matrix.ts), NOT DB rows. This migration is the rate_limits table + touch fn only.

create table if not exists public.rate_limits (
  bucket        text        not null,
  identifier    text        not null,
  window_start  timestamptz not null,
  count         integer     not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (bucket, identifier, window_start)
);

comment on table public.rate_limits is
  'P10a fixed-window rate-limit counters. (bucket,identifier,window_start) = one window; count increments per hit. Service-role only (no anon/authenticated access).';

-- Supports the periodic prune of expired windows.
create index if not exists rate_limits_window_idx on public.rate_limits(window_start);

alter table public.rate_limits enable row level security;

-- Lock out every non-service role; the limiter is server-side only.
revoke all on public.rate_limits from anon, authenticated;

drop policy if exists rate_limits_service_role on public.rate_limits;
create policy rate_limits_service_role on public.rate_limits
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Atomic fixed-window increment. Returns TRUE when the hit is OVER the limit (caller blocks).
-- now() is bucketed into fixed windows of p_window_seconds; the counter is bumped atomically via
-- INSERT ... ON CONFLICT so concurrent lambdas cannot race past the limit. SECURITY DEFINER with a
-- pinned search_path so the server-side service-role limiter can call it cleanly.
create or replace function public.rate_limit_touch(
  p_bucket text,
  p_identifier text,
  p_window_seconds integer,
  p_max integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits (bucket, identifier, window_start, count, updated_at)
    values (p_bucket, p_identifier, v_window_start, 1, now())
  on conflict (bucket, identifier, window_start)
    do update set count = public.rate_limits.count + 1, updated_at = now()
  returning count into v_count;
  return v_count > p_max;
end;
$$;

revoke all on function public.rate_limit_touch(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_touch(text, text, integer, integer) to service_role;
