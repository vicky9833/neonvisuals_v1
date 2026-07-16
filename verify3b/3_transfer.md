# 3b Item 3 — Atomic owner-transfer (DB-enforced)

## Mechanism (migration 029)
`transfer_ownership(target_user_id uuid)` — SECURITY DEFINER, invoked under the caller's JWT.
- Identity DERIVED: `auth.uid()`; company DERIVED from the caller's active `org_owner` membership
  (`SELECT … FOR UPDATE` to serialise concurrent transfers). Target/company are never spoofable input.
- Atomic **DEMOTE-THEN-PROMOTE** (owners 1 → 0 → 1, never 2, so `one_org_owner_per_company` holds
  throughout). The transient zero-owner state is permitted ONLY because the function sets the
  transaction-local `app.owner_transfer` flag that the guard honors; every other path sees it unset.
- `revoke from anon/public; grant execute to authenticated`.

## Evidence (real JWT sessions, never service-role) — from `_guards_test_run.txt`
```
before: [{ownerC: org_owner}, {memberC: viewer}]
owner transfers to memberC -> OK
after:  [{ownerC: org_admin}, {memberC: org_owner}] | owners: 1
target is sole owner: true | prior owner -> admin: true | exactly one owner: true
NON-owner calls transfer -> DENIED ✓          (auth.uid() no longer an owner)
transfer to non-member  -> DENIED ✓           (target not an active member of caller's company)
client bare owner-swap (no flag) -> DENIED ✓  (LAST_OWNER — bypass unreachable outside the function)
concurrency two transfers -> ok=1 err=1 | owners after: 1 (expect 1)
```
- **Transfer**: target becomes sole `org_owner`, prior owner → `org_admin`, exactly one owner, one
  transaction (before/after pasted above).
- **Non-owner** call → DENIED (the RPC checks `auth.uid()` is the active owner).
- **Non-member / cross-company** target → DENIED.
- **Bypass airtightness**: a client cannot set `app.owner_transfer` (PostgREST exposes no
  arbitrary-GUC setter and there is no other setter); a bare client owner-swap outside the function
  is blocked by the guard (`LAST_OWNER`). Proven above.
- **Concurrency**: two simultaneous transfers → exactly one applies (`FOR UPDATE` serialises; the
  loser re-reads the caller as no-longer-owner and is denied). Owners after = 1.
