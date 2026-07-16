-- ============================================================
-- 027_c3_dead_tables_deprecate_rename.sql — Prompt 2b Phase 2 C3
-- ============================================================
-- Deprecate the 5 dead tables via RENAME (do NOT drop). All 0-row, zero code/
-- function/view/policy references (recon R4). Internal FKs follow the rename.
-- Restore each: ALTER TABLE public._deprecated_<name> RENAME TO <name>;
-- Full DDL: verify2b/schema_snapshot_2026-07-16.sql (§C3)
-- ============================================================

ALTER TABLE public.kit_items RENAME TO _deprecated_kit_items;
ALTER TABLE public.kits RENAME TO _deprecated_kits;
ALTER TABLE public.quote_items RENAME TO _deprecated_quote_items;
ALTER TABLE public.gift_history RENAME TO _deprecated_gift_history;
ALTER TABLE public.recommendation_logs RENAME TO _deprecated_recommendation_logs;
