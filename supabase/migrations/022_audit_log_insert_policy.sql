-- =============================================================================
-- Neon Visuals — audit_log INSERT policy (022)  [Prompt 2, items 3 & 8]
-- =============================================================================
-- ADDITIVE. audit_log had ONLY a SELECT policy, so appends were impossible via
-- the request-scoped (authenticated) client — they could only happen on the
-- service-role client. Item 3 requires cross-tenant platform access to be
-- recorded WITHOUT riding the service-role client. This policy lets an
-- authenticated caller append an audit row ATTRIBUTED TO THEMSELVES only
-- (actor_user_id = auth.uid()), preventing forgery. The append-only trigger
-- still blocks all UPDATE/DELETE, so the log stays immutable.
--
-- Applied to hosted project xserhblhiwtmaiejbvgo (free plan, no PITR).
-- =============================================================================

CREATE POLICY "audit_log_insert_self" ON public.audit_log FOR INSERT
  WITH CHECK (actor_user_id = auth.uid());
