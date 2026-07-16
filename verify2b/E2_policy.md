# E2 — `system_settings` RLS re-gated OFF `profiles.role`

**Migration applied (live shared DB):** `e2_system_settings_policy_off_profiles_role`.

## Change
Dropped the old policy and replaced it with a platform-plane gate (renamed for clarity):
```sql
DROP POLICY IF EXISTS "Super admin system_settings" ON public.system_settings;
CREATE POLICY "Platform staff system_settings" ON public.system_settings
  FOR ALL
  USING (public.is_platform_staff())
  WITH CHECK (public.is_platform_staff());
```
- **Old:** `USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role='super_admin'))` — the
  conflated `profiles.role` model being retired.
- **New:** gates on `is_platform_staff()` (`EXISTS(platform_staff WHERE user_id=auth.uid())`) — two-plane.
- The sibling `Service role system_settings` (`auth.role()='service_role'`) policy is unchanged.
- **App impact: none.** `src/lib/admin/settings.ts` reads+writes `system_settings` exclusively via the
  **service-role** admin client (covered by the service policy). The re-gated policy only governs
  direct user-client access (defense-in-depth), preserving "platform staff yes, tenants no."

This was the **last DB object referencing `profiles.role`.** Remaining references are now only the
auto-following `profiles_role_check` constraint and `idx_profiles_role` index (re-confirmed in C0).

## Acceptance — user-client sessions (service role bypasses RLS, so real JWTs used)
Run log: `./verify2b/E2_policy_run.txt`.
```
STAFF_UID=40b69243-…  TENANT_UID=1fe2f102-…
INSERTED platform_staff(owner) for staff
===== STAFF (platform_staff owner) =====
STAFF_SELECT_ROWS=1
STAFF_UPDATE_ROWS=1
===== TENANT (no platform_staff, no membership) =====
TENANT_SELECT_ROWS=0
TENANT_UPDATE_ROWS=0
===== CLEANUP =====
RESIDUE_platform_staff=0
RESIDUE_profiles_t2b=0
RESIDUE_auth_users_t2b=0
```
- **Platform-staff user**: can SELECT (1 row) and UPDATE (1 row) `system_settings`. ✅
  (UPDATE PATCHed the `global` row's `settings` back to its current value — no data change.)
- **Tenant/non-staff user**: SELECT and UPDATE both return **0 rows** — RLS-denied. ✅
- All `t2b_` test users + the temp `platform_staff` row deleted; residue = **0** across
  `platform_staff`, `profiles`, `auth.users`.
