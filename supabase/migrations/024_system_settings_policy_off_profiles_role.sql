-- ============================================================
-- 024_system_settings_policy_off_profiles_role.sql — Prompt 2b E2
-- ============================================================
-- Re-gate the system_settings RLS policy OFF profiles.role and onto
-- the platform plane (is_platform_staff()). This was the last DB
-- object referencing profiles.role. The sibling service_role policy
-- is unchanged; app access is via the service-role client.
-- Applied to the shared project as remote migration version
-- 20260716025342_e2_system_settings_policy_off_profiles_role.
-- ============================================================

DROP POLICY IF EXISTS "Super admin system_settings" ON public.system_settings;

CREATE POLICY "Platform staff system_settings" ON public.system_settings
  FOR ALL
  USING (public.is_platform_staff())
  WITH CHECK (public.is_platform_staff());
