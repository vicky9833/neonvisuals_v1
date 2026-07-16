# 3a Item 3 — Invite-accept: SECURITY DEFINER `accept_invite(raw_token)` (security core)

## Mechanism (migration 028)
`public.accept_invite(raw_token text) returns uuid`, `SECURITY DEFINER`,
`set search_path = public, extensions`. `revoke ... from public, anon; grant execute to
authenticated`. Invoked under the **invitee's own JWT** via PostgREST rpc — never the
service-role client.

- (a) **Identity derived, never passed:** the only argument is `raw_token`.
  `v_uid := auth.uid()`, `v_email := lower(auth.jwt()->>'email')`. No user_id/email/
  company/role parameters exist.
- (b) **Token check in-DB:** `v_hash := encode(extensions.digest(raw_token,'sha256'),'hex')`.
- (c) **Atomic single-use row-count guard:**
  `UPDATE invites SET status='accepted', accepted_at=now() WHERE token_hash=v_hash AND
  status='pending' AND expires_at>now() AND lower(email)=v_email RETURNING * INTO v_invite;`
  then `GET DIAGNOSTICS v_rows = ROW_COUNT; IF v_rows<>1 THEN RAISE`. THEN insert the
  membership. Two concurrent accepts: the row lock serialises them; the loser re-evaluates
  `status='pending'` → 0 rows → RAISE → rollback.
- (e) **Values bound to the invite:** the INSERT uses `company_id/role/department_id` from
  `v_invite` and `user_id := auth.uid()` — never caller input.
- Defense-in-depth: `company_members_manage` untouched — a bare self-insert outside this
  function still fails for a non-member.

## Evidence — ALL at the user-JWT layer (real invitee sessions, never service role)
From `_invite_test_run.txt`:
```
=== ITEM 3: accept_invite RPC ===
(a) valid accept -> OK companyId=93c3f01c-…
    membership row: {"company_id":"93c3f01c-…","user_id":"413de772-…","role":"viewer",
                     "status":"active","invited_by":"854066d1-…"}
    invite row: {"status":"accepted","accepted_at":"2026-07-16T05:59:03.79…"}
    user_id == invitee (derived): true | role == invite's 'viewer': true
(b) reuse same token -> DENIED ✓ (P0001)
(c) expired token -> DENIED ✓
(d) email-bound (token for X, caller Y) -> DENIED ✓
(e) accept binds values to invite -> OK; membership.role=hr (invite said 'hr'), company=true
    RPC signature takes ONLY raw_token — caller cannot request a different company/role.
(f) bare self-insert (no invite) -> DENIED (RLS company_members_manage) ✓
(g) concurrency two accepts -> ok=1 err=1; membership rows for user=1 (expect exactly 1)
```

| case | requirement | result |
|------|-------------|--------|
| a | valid → self-insert + invite→accepted (both rows shown) | ✅ |
| b | same token reused → denied (row-count guard, P0001) | ✅ |
| c | expired token → denied | ✅ |
| d | token for email X, caller Y → denied (email binding) | ✅ |
| e | membership bound to invite's company/role (not caller-chosen) | ✅ |
| f | bare self-insert, no invite → denied by RLS | ✅ |
| g | concurrent double-accept → exactly one membership, one accepted invite | ✅ |

All `t3a_` users/invites/members/companies cleaned up; **zero residue** (companies=0,
invites=0, members=0, auth_users(t3a_)=0). Accept path used only the invitee's bearer
token; service role was used solely for setup/teardown.
