-- ============================================================
-- 029_prompt3b_ownership_guards.sql — Prompt 3b security core (items 1-3)
-- ============================================================
-- Reality: one_org_owner_per_company (partial UNIQUE, non-deferrable) already
-- enforces AT MOST ONE org_owner per company. We KEEP it. The guards below add
-- the AT LEAST ONE invariant and the atomic owner-swap.
--
-- (1/2) LAST-OWNER GUARD — BEFORE UPDATE OR DELETE trigger on company_members.
--       Blocks demote / status-deactivate / delete of the sole active org_owner
--       (covers direct SQL, self-demote, role editor, remove). Catchable
--       'LAST_OWNER:' message. EXCEPT when the transaction-local guard-bypass
--       flag `app.owner_transfer` is set — which ONLY transfer_ownership does.
--
-- (3)  transfer_ownership(target) — SECURITY DEFINER under the caller's JWT.
--       Company DERIVED from the caller's active org_owner membership (never
--       passed). Atomic DEMOTE-THEN-PROMOTE (owner count 1 -> 0 -> 1, never 2,
--       so one_org_owner_per_company holds throughout). The transient ZERO-owner
--       state is permitted ONLY because the flag is set inside this function.
--       SELECT ... FOR UPDATE on the caller's owner row serialises concurrency.
--
-- Bypass airtightness: the flag is a transaction-local GUC set via
-- set_config(..., is_local => true) INSIDE transfer_ownership only. PostgREST
-- gives clients no way to set arbitrary GUCs, and there is no other setter — so
-- anon/authenticated callers can never reach the bypass. (org.delete will join
-- the flag's sanctioned setters when it is built — deferred.)
-- ============================================================

create or replace function public.guard_last_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_was_active_owner boolean;
  v_still_active_owner boolean;
  v_other_owners int;
begin
  -- Sanctioned atomic owner-swap (transfer_ownership) — permit the transient state.
  if coalesce(current_setting('app.owner_transfer', true), '') = '1' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_op = 'DELETE' then
    v_was_active_owner   := (old.role = 'org_owner' and old.status = 'active');
    v_still_active_owner := false;
  else
    v_was_active_owner   := (old.role = 'org_owner' and old.status = 'active');
    v_still_active_owner := (new.role = 'org_owner' and new.status = 'active');
  end if;

  if v_was_active_owner and not v_still_active_owner then
    select count(*) into v_other_owners
      from public.company_members
     where company_id = old.company_id
       and role = 'org_owner'
       and status = 'active'
       and id <> old.id;
    if v_other_owners = 0 then
      raise exception
        'LAST_OWNER: Cannot remove the last owner — transfer ownership first'
        using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists trg_guard_last_owner on public.company_members;
create trigger trg_guard_last_owner
  before update or delete on public.company_members
  for each row execute function public.guard_last_owner();

create or replace function public.transfer_ownership(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company uuid;
  v_rows int;
begin
  if v_uid is null then
    raise exception 'TRANSFER: not authenticated' using errcode = '28000';
  end if;
  if target_user_id = v_uid then
    raise exception 'TRANSFER: cannot transfer ownership to yourself' using errcode = '22023';
  end if;

  -- Caller must be an ACTIVE org_owner; lock that row to serialise concurrent transfers.
  select company_id into v_company
    from public.company_members
   where user_id = v_uid and role = 'org_owner' and status = 'active'
   for update;
  if v_company is null then
    raise exception 'TRANSFER: only an active org_owner can transfer ownership' using errcode = '42501';
  end if;

  -- Target must be an ACTIVE member of the SAME company (derived, not passed).
  perform 1 from public.company_members
    where user_id = target_user_id and company_id = v_company and status = 'active';
  if not found then
    raise exception 'TRANSFER: target must be an active member of your company' using errcode = '22023';
  end if;

  -- Enable the guard bypass for THIS transaction only (transaction-local).
  perform set_config('app.owner_transfer', '1', true);

  -- DEMOTE caller first (owners: 1 -> 0, allowed only under the flag), ...
  update public.company_members set role = 'org_admin'
    where user_id = v_uid and company_id = v_company and role = 'org_owner' and status = 'active';
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then raise exception 'TRANSFER: demote failed' using errcode = 'P0001'; end if;

  -- ... then PROMOTE target (owners: 0 -> 1). one_org_owner_per_company never sees 2.
  update public.company_members set role = 'org_owner'
    where user_id = target_user_id and company_id = v_company and status = 'active';
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then raise exception 'TRANSFER: promote failed' using errcode = 'P0001'; end if;

  return v_company;
end;
$$;

revoke all on function public.transfer_ownership(uuid) from public;
revoke all on function public.transfer_ownership(uuid) from anon;
grant execute on function public.transfer_ownership(uuid) to authenticated;
