# Prompt 3b — Summary (team & role management + ownership guards)

Branch `foundation`. Additive/expand only. Decision: Option 1 (role editor = non-owner roles;
ownership only via transfer). Migration `029_prompt3b_ownership_guards.sql`.

## Items
| # | item | artifact | result |
|---|------|----------|--------|
| 1 | Last-owner protection (DB trigger; role/status/delete) | `1_last_owner.md` | ✅ all doors DENIED at DB layer |
| 2 | Self-demote (same guard) | `2_self_demote.md` | ✅ sole-owner self-demote DENIED; non-owner self-change ALLOWED |
| 3 | Atomic transfer_ownership (demote→promote, flag-guarded) | `3_transfer.md` | ✅ transfer works; non-owner/non-member/bare-swap DENIED; concurrency one-applies |
| 4 | /dashboard/team page (tenant plane) | `4_team_page.md` | ✅ owner/admin controls; others read-only; tenant-isolated |
| 5 | Role editor + remove (routes, guards, email) | `5_role_remove.md` | ✅ role change (real Resend id); 403 non-owner; 409 last-owner; remove works |
| 6 | Types + allowlist | `6_wiring.md` | ✅ tenant class inherited; RPC typed; routes registered |

## Security core (items 1-3) — proven at the DB layer under real sessions
- Last-owner guard = `BEFORE UPDATE OR DELETE` SECURITY DEFINER trigger `trg_guard_last_owner`;
  covers demote, **status-deactivate**, delete, self-demote; catchable `LAST_OWNER:` message → 409.
- `transfer_ownership` = atomic demote-then-promote under caller JWT, company derived, `FOR UPDATE`
  serialised; transient zero-owner permitted ONLY via the transaction-local `app.owner_transfer`
  flag (set only inside the function; unreachable by clients — proven).

## tsc + build
- `tsc --noEmit` exit 0; `npm run build` GREEN (412 pages; `ƒ /dashboard/team`,
  `ƒ /api/team/members/[userId]`, `ƒ /api/team/transfer` registered).

## Residue
`companies(t3b_)=0, company_members=0, auth_users(t3b_)=0, email_log(t3b_)=0`.
(Owner-row teardown required temporarily disabling `trg_guard_last_owner` — the guard correctly
blocks deleting the sole owner even for cleanup; noted as the org-delete obligation below.)

## Decisions I STOPPED for (resolved by you)
1. **Role editor target roles → Option 1** (non-owner only; ownership via transfer). Built.
2. **Schema reality `one_org_owner_per_company`** (partial UNIQUE, non-deferrable) contradicted the
   confirmed promote-first / transient-two-owner design → you ruled **keep the index**, transfer =
   atomic **demote-then-promote** with a transaction-local guard-bypass flag, and item-1 acceptance
   revised to "exactly one active owner." Built to that.

## Flags / obligations (recorded)
- **Recon gap:** `one_org_owner_per_company` was NOT in recon R3. It structurally guarantees the
  single-owner model; future owner logic must account for it.
- **org.delete obligation (deferred, per your instruction):** the last-owner guard also blocks
  deleting the sole owner during a full-org teardown. When `org.delete` is built, it must join the
  `app.owner_transfer` flag's sanctioned setters (its own bypass + acceptance proof). For 3b the
  bypass exists for `transfer_ownership` ONLY.
- **Confirmed but constrained:** "non-sole owner demotes self → ALLOWED" (original item-2 wording)
  is structurally impossible under the index; proven instead via a non-owner self-demote.

## Out of scope (untouched): /ops/team, /ops/staff (not built), platform_staff.

**STOP — one build-green commit on `foundation`. Holding for your promote call. Never main.**
