# C6 — AUDIT_LOG REALITY

## Does the table exist? **YES** (`public.audit_log`)

## Immutability trigger — PRESENT ✅
```
Trigger: trg_audit_log_no_update
  BEFORE DELETE OR UPDATE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_is_append_only()
```
Append-only enforcement is in place: both UPDATE and DELETE are blocked by the trigger
(consistent with the policy note in `server.ts` that there is no UPDATE/DELETE policy and a
trigger blocks mutation even for the table owner / service role).

## `company_id` FK constraint — PRESENT ✅
- `audit_log_company_id_fkey`: `FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL`
- (Also `audit_log_actor_user_id_fkey`: `FOREIGN KEY (actor_user_id) REFERENCES auth.users(id)`)

Note the `ON DELETE SET NULL` on company_id: deleting a company nulls the audit row's
company_id rather than cascading — audit history survives company deletion (correct for
an audit trail), but company-scoped audit reads must tolerate NULL company_id rows.

## Is anything writing rows yet? **NO**
- `audit_log` row count: **0**.
- Combined with C1/C2: no code path currently inserts into `audit_log` (no `.from("audit_log")`
  writes were found in the service-role sweep). The table + guardrails exist but the
  application does not emit audit events yet — that wiring is Prompt 2+ work.

## Headline
`audit_log` exists with a working append-only trigger and a `company_id` FK
(`audit_log_company_id_fkey`, ON DELETE SET NULL), but **0 rows** — nothing is writing to
it yet. The immutability infrastructure is ready before any producer exists.
