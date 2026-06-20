# Implementation Plan: Catalog Collections I/J/K

## Overview

This plan expands the catalog from 8 to 11 collections through additive-only
database changes (two migration files), keeps the static `src/data/buckets.ts`
layer and TypeScript types in sync, adds a homepage time-saver section, applies
the brand-voice / catalog-count copy updates, and prepares the `products` table
for images without processing any. Image processing is deferred behind an
explicit, blocked task that must pause for the source images folder.

Safe ordering is enforced: the enum migration (`003`) commits before the seed
migration (`004`) references the new enum values; TypeScript types are widened
before the static data that uses them; and image processing is gated last.

All database changes are `ALTER`/`INSERT` only — no `DROP`, no `CREATE TABLE`,
no RLS changes — and prices stay out of the public static layer.

## Tasks

- [x] 1. Database migrations for collections I/J/K
  - [x] 1.1 Create `supabase/migrations/003_add_collections_ijk.sql` (enum batch only)
    - Add ONLY `ALTER TYPE bucket_code ADD VALUE IF NOT EXISTS 'I';`, `'J'`, `'K'` — one statement per value, with a header comment explaining the split from `004`
    - This file must contain no `INSERT`/`ALTER TABLE`/`DROP`/`CREATE` so it commits first and the new enum values are usable by `004`
    - _Requirements: 1.1, 1.2, 1.6, 7.1, 7.4_

  - [x] 1.2 Create `supabase/migrations/004_seed_collections_ijk.sql` (bucket rows, column, 29 products)
    - (a) Insert 3 `buckets` rows (I/J/K) using the exact `seed.sql` column set (`code, name, slug, description, purpose, primary_buyer, asp_range_min, asp_range_max, icon, sort_order, seo_title, seo_description, is_active`) with `asp_range_min/max` NULL, icons `PartyPopper`/`GraduationCap`/`Contact`, sort_order 9/10/11, ending `ON CONFLICT (code) DO NOTHING`
    - (b) `ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;` — leave `images TEXT[]` and `thumbnail_url TEXT` untouched
    - (c) Insert 29 product rows (NV-I01–I13, NV-J01–J08, NV-K01–K08) using the `seed.sql` product column pattern, resolving `bucket_id` via `(SELECT id FROM buckets WHERE code = 'I'/'J'/'K')`
    - Use the exact verbatim `name`/`tagline`/`description` from the design SKU tables (single quotes doubled for SQL escaping); set all price columns (`cogs`, `price_single`, `price_bulk_25`, `price_bulk_100`, `margin_percent`) to NULL and omit `image_url` from the column list
    - Apply the design field-mapping rules: `occasions[]` and `personalization_types[]` contain only valid enum members; non-mappable `use_cases`/`personalisation`/`category_tags` captured as `use:`/`pers:`/literal tags; `wow_score` per table (CHECK 1–10); `recommended_packaging` derived from `wow_score`; `archetypes[]` authored per SKU; `sort_order` 1..n per collection
    - _Requirements: 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 6.1, 6.2, 6.3, 7.1, 7.2_

  - [ ]* 1.3 Write property tests for the seeded SKU set
    - **Property 3: New SKUs are uniquely and correctly identified** — `sku` matches `NV-[IJK][0-9]{2}`, globally unique, counts 13/8/8 per collection
    - **Property 4: New product content is valid and complete** — `wow_score` integer in [1,10]; `tagline`/`description` non-empty; every `personalization_types`/`occasions`/`archetypes` value is a valid enum member
    - **Property 5: New products carry no image yet** — every new row's `image_url` is NULL
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.5, 3.6, 6.3**

- [x] 2. Widen catalog types and sync static buckets data
  - [x] 2.1 Widen `BucketCode` and `BucketCodeEnum` to include I/J/K
    - Add `"I" | "J" | "K"` to `BucketCode` in `src/lib/types/product.ts`
    - Add the same values to `BucketCodeEnum` in `src/lib/types/database.ts`
    - _Requirements: 2.2_

  - [x] 2.2 Add I/J/K entries to `src/data/buckets.ts` and update wording
    - Append the three new `Bucket` entries (I/J/K) after H with `code`, `name`, `slug`, `purpose`, `primaryBuyer`, `description`, `icon` exactly matching the DB rows; `aspRangeMin/Max` omitted
    - Update header comment `8 product buckets (A–H)` → `11 collections (A–K)`
    - Update Bucket F `description` `hampers` → `experience kits`
    - Preserve A–H entries unchanged
    - _Requirements: 2.1, 2.3, 5.1, 5.3, 5.4_

  - [ ]* 2.3 Write property tests for the static `BUCKETS` array
    - **Property 1: Static collections mirror the database seed** — for I/J/K, exactly one `BUCKETS` entry whose `code`/`name`/`slug` equal the migration values and whose array position implies the same `sort_order`
    - **Property 2: Every static bucket entry is well-formed** — every `code` is a valid `BucketCode`, `slug` unique across the array, required string fields non-empty
    - **Validates: Requirements 2.1, 2.2**

- [ ] 3. Checkpoint - migrations and static data
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Homepage time-saver section
  - [x] 4.1 Add `TIME_SAVERS` array and time-saver `<section>` to `src/app/(marketing)/page.tsx`
    - Add `SearchX`, `ClipboardCheck`, `Clock` to the existing `lucide-react` import (`Sparkles`/`MessageCircle` already imported)
    - Define the module-level `TIME_SAVERS` inline array (4 cards with title + desc from the design)
    - Render the `<section>` after the how-it-works section and before testimonials, using the existing `Reveal` fade-in, brand card styling (cream `#F5F0E8`, border `#E5E2DC`, navy/gold icon chip), and a bottom WhatsApp CTA built from the `WHATSAPP_NUMBER` constant
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 4.2 Write unit/component test for the time-saver section
    - Assert 4 cards render with their headings/body, the section sits after how-it-works and before testimonials, and the CTA href targets the WhatsApp number
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. Catalog copy updates (brand voice + counts)
  - [x] 5.1 Update `supabase/seed.sql` header comment and Bucket F wording
    - Header comment: `8 buckets ... B–H products` → `11 collections ... B–K products`
    - Bucket F row description: `hampers` → `experience kits`
    - Leave product names, slugs, and `tags` values containing "Hamper"/"hamper" unchanged
    - _Requirements: 5.1, 5.4_

  - [x] 5.2 Update `src/app/(marketing)/products/page.tsx` count copy
    - Metadata description `100+` → `130+` (and extend the line list per design)
    - _Requirements: 5.2_

  - [x] 5.3 Update `src/data/occasions.ts` brand-voice copy
    - FAQ answer: `Sustainability bucket` → `Sustainability collection`
    - Diwali `seoDescription`: `generic hampers` → `generic experience kits`
    - _Requirements: 5.3, 5.4_

  - [x] 5.4 Update `src/components/marketing/corporate-tabs.tsx`
    - `generic hamper from a catalogue` → `generic experience kit from a catalogue`
    - _Requirements: 5.4_

  - [x] 5.5 Update `src/app/(marketing)/page.tsx` price-voice copy
    - `MOST_COMPANIES` entry: `Cost measured per unit...` → `Investment measured per unit...`
    - Leave the `JOURNAL` blog-post title "The True Cost of Generic Corporate Gifts" unchanged (tied to its slug) and leave internal code comments using "cost" unchanged
    - _Requirements: 5.5_

  - [ ]* 5.6 Write tests for copy swaps and public no-price guarantee
    - Assert each enumerated copy replacement is present and the flagged blog title / code identifiers are unchanged
    - **Property 6: The public static layer exposes no prices** — no price-bearing field carries a rendered monetary value on the public `BUCKETS`/`PRODUCTS` surface
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 7.3**

- [ ] 6. Checkpoint - UI and copy
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Validate the full change set
  - [x] 7.1 Verify migrations, build, counts, and safety constraints
    - Confirm `003`/`004` apply cleanly on a fresh DB (or that the SQL is syntactically valid) and that the `bucket_code` enum contains I/J/K and `products.image_url` exists as nullable `TEXT`
    - Run the TypeScript build (`npm run build`, or `tsc --noEmit`) and confirm it passes with the widened types and new static entries
    - Assert `BUCKETS` length is 11 and the 29 new SKUs (NV-I01–I13, NV-J01–J08, NV-K01–K08) are present in the seed
    - Grep `003`/`004` to confirm no `DROP`, no `CREATE TABLE`, and no RLS/policy statements, and confirm no prices appear in the public static layer
    - _Requirements: 1.6, 3.1, 3.2, 3.3, 6.1, 6.2, 7.1, 7.2, 7.3, 7.4_

- [ ] 8. DEFERRED (BLOCKED on user input) - request product images folder
  - [x] 8.1 Pause and request the source product images folder
    - **Do NOT process, upload, resize, or map any images in this task.**
    - Pause and ask the user to provide the source product images folder before any image work begins
    - Once provided, a separate future task will map filenames to SKUs, upload to Supabase Storage, and populate `image_url` — none of that happens here
    - _Requirements: 6.3, 6.4_

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP.
- Migration `003` (enum) MUST be applied/committed before `004` (seed) because PostgreSQL forbids using a new enum value in the transaction that adds it.
- All buckets.ts edits (new entries, header comment, Bucket F wording) are consolidated into task 2.2 to avoid editing the same file in multiple tasks.
- Task 8 is intentionally last and blocked — it only requests input and must not perform image processing.
- The design's Correctness Properties drive the property-test sub-tasks (1.3, 2.3, 5.6); unit tests cover the homepage section.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "4.1", "5.1", "5.2", "5.3", "5.4"] },
    { "id": 2, "tasks": ["5.5", "1.3", "2.3"] },
    { "id": 3, "tasks": ["4.2", "5.6"] },
    { "id": 4, "tasks": ["7.1"] },
    { "id": 5, "tasks": ["8.1"] }
  ]
}
```
