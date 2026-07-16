# 3a Item 2 — Invite creation (owner/admin → member)

## Implementation
- `src/lib/invites.ts` (server-only): `generateInviteToken()` (32-byte base64url),
  `hashInviteToken()` = **SHA-256 hex** (byte-identical to the DB's
  `encode(extensions.digest(raw,'sha256'),'hex')`), `inviteExpiryISO()` (+7d),
  `inviteAcceptUrl()` (raw token in link only).
- `src/app/api/team/invites/route.ts` (POST): `requireTenant("members.invite", null)`
  (owner/admin per matrix), then inserts the invite on the **request-scoped user client**
  so the existing `invites_manage` RLS is the live gate — NOT the service-role client.
  Stores `token_hash` only; returns `{ id, acceptUrl }` (raw token only in the link).
  `org_owner` is intentionally not invitable (transfer = 3b).

## Evidence (real t3a_ owner via user JWT; RLS is the gate)
From `_invite_test_run.txt`:
```
=== ITEM 2: invite creation RLS ===
owner(org_owner) create invite ->  ALLOWED
  token_hash stored: c21520b044af…  raw token != hash: true
  status: pending | expires_at set: true
  accept link (raw token only in link): http://localhost:3000/invite/accept?token=RtwCJBrf…
outsider(non-member) create invite ->  DENIED (RLS) ✓
```
- Owner (org_owner member) INSERT succeeds under `invites_manage`; row has `token_hash`
  (≠ raw token), `status='pending'`, `expires_at` set. Raw token appears only in the link.
- A non-member (outsider) INSERT is **DENIED by RLS** — the policy is not weakened.

## Schema note (discovered, not in recon R2)
`invites` has `UNIQUE (company_id, lower(email)) WHERE status='pending'`
(`one_pending_invite_per_email`) and `UNIQUE (token_hash)`. So a second pending invite for
the same (company, email) is rejected at the DB — a good guard the create route inherits.
