# Item 8 — audit_log starts writing + company_id FK dropped

## FK-drop migration (constraint DROP that loosens — allowed non-destructive)
`supabase/migrations/021_audit_log_company_fk_drop.sql`:
```sql
ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_company_id_fkey;
```
Verified in DB: `company_fk_remaining = 0`, `remaining_fks_total = 1` (only
`audit_log_actor_user_id_fkey` remains), trigger `trg_audit_log_no_update` intact.
`company_id` is now a plain uuid that RETAINS its value after a company is deleted (forensics).

## Audit writes wired (the event P2 introduces: platform cross-tenant access, item 3)
`src/lib/authz/audit.ts` `writeAudit()` appends via the REQUEST-SCOPED client through the
`audit_log_insert_self` RLS policy (mig 022, `actor_user_id = auth.uid()`) — never the
service-role client. Called by `auditCrossTenantAccess()`/`requirePlatform()` in api-auth.
(Role-change / PII-access audits are deferred to P3/P4 where those events exist — not faked.)

## A written audit row (real, via RLS as the platform owner)
```json
{ "id": 5, "actor_type": "platform", "action": "order.list", "entity": "order",
  "company_id": null, "created_at": "2026-07-15T09:40:09.338623+00:00" }
```

## Append-only trigger still blocks UPDATE (proof)
A privileged, RLS-bypassing service-role UPDATE is rejected by the trigger:
```
UPDATE public.audit_log SET action='tampered' WHERE id=5;
-> ERROR: P0001: audit_log is append-only; UPDATE is not permitted
   CONTEXT: PL/pgSQL function public.audit_log_is_append_only() line 2
```
Post-check: `SELECT action FROM audit_log WHERE id=5` → still `order.list` (untampered).
(Full run log: `verify/3_audit_run.txt`.)
