-- =============================================================================
-- Neon Visuals — audit_log.company_id FK drop (021)  [Prompt 2, item 8]
-- =============================================================================
-- CONSTRAINT DROP that LOOSENS (not a data/column drop) → allowed under the
-- non-destructive rule. After this, audit_log.company_id is a PLAIN UUID that
-- RETAINS its value after the referenced company is deleted (forensics). The
-- append-only trigger (trg_audit_log_no_update → audit_log_is_append_only) is
-- left intact and continues to block UPDATE/DELETE for everyone incl. service_role.
--
-- Applied to hosted project xserhblhiwtmaiejbvgo (free plan, no PITR).
-- =============================================================================

ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_company_id_fkey;

COMMENT ON COLUMN public.audit_log.company_id IS
  'Plain UUID (no FK as of 021). Retains its value after the company is deleted '
  'so the audit trail survives org deletion. Forensics-first.';
