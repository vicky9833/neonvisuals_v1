-- ============================================================
-- 028_prompt3a_accept_invite.sql — Prompt 3a item 3 (security core)
-- ============================================================
-- SECURITY DEFINER invite-accept RPC. The ENTIRE invariant lives in the DB:
-- token possession + email binding + pending/expiry + atomic single-use.
--
-- Invoked under the INVITEE'S OWN JWT (authenticated role) via PostgREST rpc —
-- NEVER the service-role client. Identity is DERIVED (auth.uid()/auth.jwt()),
-- never passed as an argument. The only argument is the raw token.
--
-- Single-use is an atomic row-count guard (UPDATE ... WHERE status='pending'
-- RETURNING), not read-then-write: two concurrent accepts of one token → the
-- second sees status='accepted' (row locked then re-evaluated) → 0 rows → raise
-- → rollback. Exactly one membership row results.
--
-- Defense-in-depth: company_members_manage stays as-is (a bare self-insert
-- OUTSIDE this function still fails for a non-member). This function is the
-- ONLY sanctioned insert path for a joining invitee.
-- ============================================================

create or replace function public.accept_invite(raw_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := lower(auth.jwt() ->> 'email');
  v_hash  text := encode(extensions.digest(raw_token, 'sha256'), 'hex');
  v_invite public.invites%rowtype;
  v_rows  int;
begin
  -- (a) identity is derived, never passed
  if v_uid is null then
    raise exception 'accept_invite: not authenticated' using errcode = '28000';
  end if;
  if v_email is null or v_email = '' then
    raise exception 'accept_invite: no verified email on session' using errcode = '28000';
  end if;
  if raw_token is null or length(raw_token) < 16 then
    raise exception 'accept_invite: invalid token' using errcode = '22023';
  end if;

  -- (b,c,d) + atomic single-use consume. Only a PENDING, UNEXPIRED invite whose
  -- token hash matches AND whose email equals the caller's verified email can be
  -- flipped. Row-count guard makes reuse/expiry/wrong-email all fail here.
  update public.invites
     set status = 'accepted', accepted_at = now()
   where token_hash = v_hash
     and status = 'pending'
     and expires_at > now()
     and lower(email) = v_email
  returning * into v_invite;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'accept_invite: token invalid, expired, already used, or not addressed to you'
      using errcode = 'P0001';
  end if;

  -- (e) inserted values come from the INVITE + session ONLY (never caller-chosen)
  insert into public.company_members (company_id, user_id, role, department_id, status, invited_by)
  values (v_invite.company_id, v_uid, v_invite.role, v_invite.department_id, 'active', v_invite.invited_by);

  return v_invite.company_id;
end;
$$;

-- (d) not anon; authenticated invitees only. Never the service-role client path.
revoke all on function public.accept_invite(text) from public;
revoke all on function public.accept_invite(text) from anon;
grant execute on function public.accept_invite(text) to authenticated;
