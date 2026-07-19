-- P11a — catalog reconciliation (additive; no destructive change).
--
-- Adds products.public_payload jsonb: stores the EXACT static Product object per SKU
-- (computed fields verbatim) so the DB→static regenerate step reproduces src/data/products.ts +
-- src/data/product-images.ts BYTE-IDENTICALLY via the existing pure serializers. The payload is the
-- regen source of truth; the pre-existing structured columns (name/slug/images[]/gallery_images[]/
-- image_url/thumbnail_url/tags/bucket_id) are populated too for P11b's admin use.
--
-- Stale-seed retirement uses the existing product_status enum ('archived') — no new column needed.
-- kitHeroImages (a top-level export of products.ts) is stored in system_settings, id
-- 'catalog_kit_hero_images' — no schema change required there.

alter table public.products add column if not exists public_payload jsonb;

comment on column public.products.public_payload is
  'P11a: exact static Product object per SKU (verbatim, computed fields included). Regen source of truth for src/data/products.ts. NULL on the retired stale seed rows.';
