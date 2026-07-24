-- =============================================================================
-- Neon Visuals - order_items custom/charge line fields (059)  [Phase 5B Task 2]
-- =============================================================================
-- ADDITIVE ONLY. Brings the ops order path to parity with the quote builder's
-- custom + charge line items (Phase 5A). Orders store line items in the
-- normalized child table `order_items` (one row per line), so the new line
-- metadata is added as nullable columns there:
--
--   source    - 'catalogue' (default/None) | 'custom' | 'charge'
--   hsn       - 4-8 digit HSN/SAC, when supplied
--   gst_rate  - per-line GST %, when supplied (quotes/orders remain tax-EXCLUSIVE
--               this phase; this is metadata carried for the later tax invoice)
--   uqc       - unit of quantity code, when supplied
--
-- All columns are NULLABLE with no default, so every existing row (the table is
-- currently empty) and every current reader/writer is unaffected. No constraint,
-- policy, or trigger is changed. product_sku stays as-is: custom/charge lines
-- carry a generated label code (CUSTOM-n / CHARGE-n), so no nullability change is
-- needed.
-- =============================================================================

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS source   text,
  ADD COLUMN IF NOT EXISTS hsn      text,
  ADD COLUMN IF NOT EXISTS gst_rate numeric,
  ADD COLUMN IF NOT EXISTS uqc      text;

-- Guard the enumerated source values (NULL allowed for legacy/catalogue rows).
ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_source_check;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_source_check
  CHECK (source IS NULL OR source IN ('catalogue', 'custom', 'charge'));

COMMENT ON COLUMN public.order_items.source   IS 'Line origin: catalogue (default) | custom | charge. Added in 059 (Phase 5B).';
COMMENT ON COLUMN public.order_items.hsn      IS '4-8 digit HSN/SAC for the line, when supplied. Added in 059.';
COMMENT ON COLUMN public.order_items.gst_rate IS 'Per-line GST %% metadata (orders remain tax-exclusive this phase). Added in 059.';
COMMENT ON COLUMN public.order_items.uqc      IS 'Unit of quantity code (PCS/BOX/SET/KGS/NOS/PKT/DOZ), when supplied. Added in 059.';
