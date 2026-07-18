-- Prompt 8c-i: dunning / plan lifecycle. Additive + reversible. No enum change.
--
-- Effective-plan model: companies.plan_status is the canonical gate source-of-truth
-- {active, past_due, lapsed}. It maps onto the existing subscriptions.status enum with NO enum
-- migration: active->active, grace->past_due, lapse->cancelled ('halted' stays unused).
-- companies.plan stays 'pro' through lapse — never flipped, never deleted (deprecate-don't-destroy).
--
-- Precondition (verified before apply): SELECT DISTINCT plan_status FROM companies ⊆ {active}
-- (0 company rows at apply time), so the CHECK validates cleanly.

-- 1) Canonical plan_status domain.
alter table public.companies drop constraint if exists companies_plan_status_check;
alter table public.companies
  add constraint companies_plan_status_check
  check (plan_status in ('active', 'past_due', 'lapsed'));

-- 2) Lapse audit timestamp (also DB-verified by the smoke).
alter table public.subscriptions add column if not exists lapsed_at timestamptz;

-- 3) The SINGLE lifecycle writer (service-role choke point; both planes, atomic in one txn).
--    Called by BOTH the billing cron and the webhook. companies.plan is only ever set to 'pro'
--    (on activation) — NEVER downgraded here. plan_status carries the lifecycle.
create or replace function public.transition_plan_status(
  p_company_id      uuid,
  p_plan_status     text,                       -- active | past_due | lapsed
  p_sub_status      text,                       -- active | past_due | cancelled
  p_subscription_id uuid        default null,
  p_period_end      timestamptz default null,
  p_lapsed_at       timestamptz default null,
  p_activate_pro    boolean     default false   -- true only on activation/renewal
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.companies
     set plan_status = p_plan_status,
         plan        = case when p_activate_pro then 'pro' else plan end
   where id = p_company_id;

  if p_subscription_id is not null then
    update public.subscriptions
       set status               = p_sub_status,
           current_period_end   = coalesce(p_period_end, current_period_end),
           lapsed_at            = case when p_plan_status = 'lapsed'
                                       then coalesce(p_lapsed_at, now())
                                       else lapsed_at end,
           updated_at           = now()
     where id = p_subscription_id;
  end if;
end;
$$;

-- Service-role only (plane seal): never callable by anon/authenticated.
revoke all on function public.transition_plan_status(uuid, text, text, uuid, timestamptz, timestamptz, boolean) from public;
revoke all on function public.transition_plan_status(uuid, text, text, uuid, timestamptz, timestamptz, boolean) from anon;
revoke all on function public.transition_plan_status(uuid, text, text, uuid, timestamptz, timestamptz, boolean) from authenticated;
grant execute on function public.transition_plan_status(uuid, text, text, uuid, timestamptz, timestamptz, boolean) to service_role;

notify pgrst, 'reload schema';
