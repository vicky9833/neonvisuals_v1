-- ============================================================
-- 025_c1_profiles_role_deprecate_rename.sql — Prompt 2b Phase 2 C1
-- ============================================================
-- Deprecate profiles.role via RENAME (do NOT drop). Reversible.
-- The auto-following profiles_role_check constraint and idx_profiles_role
-- index follow the column rename automatically.
-- Restore: ALTER TABLE public.profiles RENAME COLUMN _deprecated_role TO role;
-- Full DDL: verify2b/schema_snapshot_2026-07-16.sql (§C1)
-- Applied remotely as 20260716xxxxxx_c1_profiles_role_deprecate_rename.
-- ============================================================

ALTER TABLE public.profiles RENAME COLUMN role TO _deprecated_role;
