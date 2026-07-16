# 3b Item 1 — Last-owner protection (DB-enforced) — REVISED for exactly-one-owner

**Schema truth (recon gap):** `company_members` has a partial UNIQUE index
`one_org_owner_per_company (company_id) WHERE role='org_owner'` → **at most one** org_owner per
company. Combined with the guard below, the invariant is **exactly one active owner, always**.

## Mechanism (migration 029)
`BEFORE UPDATE OR DELETE` SECURITY DEFINER trigger `trg_guard_last_owner` on `company_members`.
Blocks demote / status-deactivate / delete of an active `org_owner` when no other active owner
exists (always true here). Raises a catchable `LAST_OWNER: Cannot remove the last owner — transfer
ownership first`. Bypassed ONLY when the transaction-local `app.owner_transfer` flag is set (set
solely inside `transfer_ownership`).

## Evidence (direct SQL via service role — triggers fire for every role)
From `_guards_test_run.txt`:
```
demote sole owner       -> DENIED ✓ (LAST_OWNER)
deactivate sole owner   -> DENIED ✓ (LAST_OWNER)   [status -> inactive path]
delete sole owner       -> DENIED ✓ (LAST_OWNER)
active owners (unchanged): 1
```
- All three doors (role demote, **status deactivate**, delete) blocked at the DB layer.
- The old "two active owners → demote one → allowed" sub-case is **unsatisfiable** under
  `one_org_owner_per_company` (two active owners can never coexist) — replaced by proving the
  exactly-one invariant + that `transfer_ownership` is the ONLY owner-changing path (see 3_transfer.md).
- The block message is the catchable `LAST_OWNER:` string the app maps to a legible 409
  ("Cannot remove the last owner — transfer ownership first") — proven via the route in 5_role_remove.md.
