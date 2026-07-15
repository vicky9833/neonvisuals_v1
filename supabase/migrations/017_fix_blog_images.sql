-- ============================================================
-- 017_fix_blog_images.sql
--
-- PURPOSE
-- The `product-images` storage bucket was fully REGENERATED. The blog
-- articles seeded in 014_blog_cms.sql reference the OLD, SKU-style paths
-- (e.g. .../product-images/NV-D01/NV-D01_01.jpeg, .../NV-A01/NV-A01_01.avif)
-- which no longer exist in the new bucket, so every hero/OG image renders
-- as a dead 404. This migration re-points every PUBLISHED post's
-- `hero_image_url` AND `og_image_url` at PREMIUM, verified product images
-- from the regenerated bucket, chosen by category + slug keyword so each
-- post gets an on-brand, visually-appealing shot.
--
-- SOURCE OF TRUTH FOR URLS
-- Every URL below is assembled from the exact `product-images` base plus a
-- path fragment copied VERBATIM from src/data/products.ts (the `imageUrl`
-- values, which are built via the `img("<path>")` helper over STORAGE_BASE
-- = the same base used here). No path is hand-constructed, so each URL is
-- guaranteed to resolve in the regenerated bucket. The chosen shots are the
-- most premium / styled hero images available per theme:
--   * Onboarding / welcome / general / copper craft -> antique copper bottle
--   * Festive / Diwali / Christmas                   -> brass diya set
--   * Awards / recognition / milestone / anniversary -> crystal award
--   * Eco / sustainability                           -> beeswax wrap set
--   * Premium DEFAULT (CEO / leadership / executive) -> curated executive gift box
--
-- IDEMPOTENT: only rows that are NULL, point OUTSIDE the current
-- product-images base, or still use the legacy SKU path
-- (product-images/NV-...) are touched. The replacement URLs use the new
-- collection-based paths, so a second run matches nothing and is a no-op.
--
-- HOW TO APPLY: this file MUST be applied through the normal Supabase
-- migration process (e.g. `supabase db push` / `supabase migration up`
-- against the linked project, or via the Supabase dashboard SQL editor as
-- part of the migration history). Do NOT run it ad hoc outside the
-- migration flow — it is versioned as migration 017.
-- ============================================================

UPDATE blog_posts
SET
  hero_image_url = CASE
    -- Festive / Diwali / Christmas -> festive brass diya set
    WHEN category = 'seasonal'
      OR slug ILIKE '%diwali%'
      OR slug ILIKE '%festiv%'
      OR slug ILIKE '%christmas%'
      THEN 'https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images/festive/diwali-brass-diya-set/brass-diya-set/brass-diya1.jpeg'

    -- Onboarding / welcome / general corporate / copper craft -> antique copper bottle
    WHEN slug ILIKE '%onboarding%'
      OR slug ILIKE '%welcome%'
      OR slug ILIKE '%day-1%'
      OR slug ILIKE '%new-joiner%'
      OR slug ILIKE '%copper%'
      OR slug ILIKE '%craftsmanship%'
      OR slug ILIKE '%moradabad%'
      THEN 'https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images/onboarding/copper-bottle/antique-copper-bottle/antique-copper-bottle-1.png'

    -- Eco / sustainability -> beeswax wrap set
    WHEN slug ILIKE '%eco%'
      OR slug ILIKE '%sustainab%'
      OR slug ILIKE '%green%'
      THEN 'https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images/sustainability/beeswax-wrap-set-3-pcs/beeswax-wrap-set-1/set-of-3-beeswax-food-wrap-1.webp'

    -- Awards / recognition / milestones / anniversaries -> crystal award
    WHEN slug ILIKE '%award%'
      OR slug ILIKE '%recognition%'
      OR slug ILIKE '%attrition%'
      OR slug ILIKE '%milestone%'
      OR slug ILIKE '%anniversary%'
      OR slug ILIKE '%desk-test%'
      THEN 'https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images/milestone/five-year/crystal-award-with-name-and-date/personalised-crystal-award-set-1/personalized-employee-crystal-awards-1.webp'

    -- CEO / leadership / executive / premium -> curated executive gift box
    WHEN slug ILIKE '%ceo%'
      OR slug ILIKE '%leadership%'
      OR slug ILIKE '%cfo%'
      OR slug ILIKE '%executive%'
      THEN 'https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images/ceo-leadership/curate-box-giftnote/curated-box-giftnote-set-2/curated-box-gift-1.jpg'

    -- Premium DEFAULT: curated executive gift box (insights / guides / culture / industry)
    ELSE 'https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images/ceo-leadership/curate-box-giftnote/curated-box-giftnote-set-2/curated-box-gift-1.jpg'
  END,
  og_image_url = CASE
    WHEN category = 'seasonal'
      OR slug ILIKE '%diwali%'
      OR slug ILIKE '%festiv%'
      OR slug ILIKE '%christmas%'
      THEN 'https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images/festive/diwali-brass-diya-set/brass-diya-set/brass-diya1.jpeg'
    WHEN slug ILIKE '%onboarding%'
      OR slug ILIKE '%welcome%'
      OR slug ILIKE '%day-1%'
      OR slug ILIKE '%new-joiner%'
      OR slug ILIKE '%copper%'
      OR slug ILIKE '%craftsmanship%'
      OR slug ILIKE '%moradabad%'
      THEN 'https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images/onboarding/copper-bottle/antique-copper-bottle/antique-copper-bottle-1.png'
    WHEN slug ILIKE '%eco%'
      OR slug ILIKE '%sustainab%'
      OR slug ILIKE '%green%'
      THEN 'https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images/sustainability/beeswax-wrap-set-3-pcs/beeswax-wrap-set-1/set-of-3-beeswax-food-wrap-1.webp'
    WHEN slug ILIKE '%award%'
      OR slug ILIKE '%recognition%'
      OR slug ILIKE '%attrition%'
      OR slug ILIKE '%milestone%'
      OR slug ILIKE '%anniversary%'
      OR slug ILIKE '%desk-test%'
      THEN 'https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images/milestone/five-year/crystal-award-with-name-and-date/personalised-crystal-award-set-1/personalized-employee-crystal-awards-1.webp'
    WHEN slug ILIKE '%ceo%'
      OR slug ILIKE '%leadership%'
      OR slug ILIKE '%cfo%'
      OR slug ILIKE '%executive%'
      THEN 'https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images/ceo-leadership/curate-box-giftnote/curated-box-giftnote-set-2/curated-box-gift-1.jpg'
    ELSE 'https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images/ceo-leadership/curate-box-giftnote/curated-box-giftnote-set-2/curated-box-gift-1.jpg'
  END
WHERE status = 'published'
  AND (
    -- No image at all
    hero_image_url IS NULL
    -- Points outside the current product-images bucket base
    OR hero_image_url NOT LIKE 'https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images/%'
    -- Legacy SKU-style path from the old (regenerated-away) bucket layout
    OR hero_image_url LIKE 'https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images/NV-%'
  );
