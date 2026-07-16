-- ============================================================
-- 026_c2_quotes_kit_id_unwire_and_deprecate_rename.sql — Prompt 2b Phase 2 C2
-- ============================================================
-- Unwire quotes.kit_id (drop FK to kits) and deprecate via RENAME (do NOT drop).
-- The single live quotes row has kit_id IS NULL, so no data moves.
-- Restore:
--   ALTER TABLE public.quotes RENAME COLUMN _deprecated_kit_id TO kit_id;
--   ALTER TABLE public.quotes ADD CONSTRAINT quotes_kit_id_fkey
--     FOREIGN KEY (kit_id) REFERENCES kits(id) ON DELETE SET NULL;  -- (kits must be un-deprecated first)
-- Full DDL: verify2b/schema_snapshot_2026-07-16.sql (§C2)
-- ============================================================

ALTER TABLE public.quotes DROP CONSTRAINT quotes_kit_id_fkey;
ALTER TABLE public.quotes RENAME COLUMN kit_id TO _deprecated_kit_id;
