# Implementation Plan: Image & Catalogue Rebuild

## Overview

This plan implements the four-stage pipeline (restructure → upload → catalogue generation → UI corrections) described in the design. Implementation language is **TypeScript** throughout, matching the existing Next.js 16 / strict-TS codebase. Scripts run via `tsx`; property tests use `vitest` + `fast-check` at ≥100 iterations each.

Work proceeds bottom-up: tooling and the extended `Product` type first, then the pure restructure logic (slugify → detection → path → tree/manifest), then the upload transport, then deterministic catalogue generation and data-file emission, then UI presentation, and finally integrity + build verification. Each property from the design is turned into its own property-based test sub-task placed next to the code it validates.

## Tasks

- [x] 1. Tooling and test infrastructure
  - [x] 1.1 Add `tsx` dev dependency and pipeline npm scripts
    - Add `tsx` to `devDependencies` in `package.json`
    - Add scripts: `restructure-images` (`tsx scripts/restructure-images.ts`), `upload-images` (`tsx scripts/upload-images-v2.ts`), `generate-catalog` (`tsx scripts/generate-catalog.ts`)
    - _Requirements: tooling (design §7)_
  - [x]* 1.2 Set up the test runner and property library
    - Add `vitest` and `fast-check` as dev dependencies and a `test` script (single-run, e.g. `vitest run`)
    - Add a minimal `vitest.config.ts` compatible with TS path aliases (`@/…`)
    - _Requirements: 24 (verification tooling)_

- [x] 2. Extend the Product type (additive only)
  - [x] 2.1 Add `MilestoneTenure` and optional fields to the `Product` interface
    - In `src/lib/types/product.ts` add `export type MilestoneTenure = "1-year" | "5-year" | "10-year"`
    - Add optional `category?: string`, `personalisation?: string`, and `milestone?: MilestoneTenure` to `Product`, retaining every existing field
    - _Requirements: 14.1, 14.2, 14.3_

- [x] 3. Slugification (restructure foundations)
  - [x] 3.1 Implement `slugify`, `slugifyFileName`, and collision resolution
    - Create `scripts/restructure-images.ts` with exported pure `slugify` (lowercase, spaces→`-`, strip outside `[a-z0-9-]`, collapse hyphens, trim) and `slugifyFileName` (slug base, retain lowercased extension)
    - Implement a per-destination-folder name allocator that appends a numeric suffix on collision and logs it
    - _Requirements: 4.1, 4.2, 4.3, 3.3_
  - [x]* 3.2 Write property test for slugify URL-safety
    - **Property 1: Slugify produces only URL-safe characters**
    - **Validates: Requirements 4.1**
  - [x]* 3.3 Write property test for filename extension preservation
    - **Property 2: Filename slugification preserves the extension**
    - **Validates: Requirements 4.2, 3.3**
  - [x]* 3.4 Write property test for collision uniqueness
    - **Property 3: Destination name collisions resolve to unique names**
    - **Validates: Requirements 4.3**

- [x] 4. Collection mapping and product-folder detection
  - [x] 4.1 Implement `COLLECTION_MAP` and top-level folder resolution
    - Add the fixed 11-entry `COLLECTION_MAP` (letter, storageSlug, displayName) keyed by exact folder name
    - Handle `ALL KITS` as a Kit_Hero_Images source (not a collection); log and exclude unmatched top-level folders; fail fast with a descriptive error when `neonvisualsfinal/` is absent (before any deletion)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x]* 4.2 Write unit tests for mapping and guards
    - Assert the full 11-entry map, `ALL KITS` exclusion, unmatched-folder logging/exclusion, and missing-source error
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 4.3 Implement `detectProducts` recursion with milestone tenure threading
    - Recursive classifier: flat-image folder → one product; immediate subfolders of only images → one product with variant sets; deeper nesting → recurse; stable-sorted ordering
    - For collection `B`, recognise tenure subfolders (`ONE YEAR`/`FIVE YEAR`/`TEN YEAR`) and thread the tenure segment through; record collection letter, product path, ordered variant sets and images
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x]* 4.4 Write property test for product-folder detection
    - **Property 4: Product-folder detection is correct across tree shapes**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 5.3**

- [x] 5. Storage-path construction and special-file handling
  - [x] 5.1 Implement destination-path builder and file-extension classification
    - Build `<collection-storage-slug>/[<tenure>/]<product-slug>/[<variant-slug>/]<file>` (omit variant for flat products; include tenure only for collection `B`)
    - Define `IMAGE_EXT`; classify `.mp4` (skip, log, count separately) and other unsupported extensions (skip, log with extension)
    - _Requirements: 3.2, 3.4, 6.1, 6.2, 6.3_
  - [x]* 5.2 Write property test for storage-path shape
    - **Property 5: Storage path shape is well-formed**
    - **Validates: Requirements 3.2, 3.4**
  - [x]* 5.3 Write unit tests for special-file handling
    - Fixture tree exercising `.mp4` skips (counted separately) and unsupported-extension skips
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 6. Local tree rebuild and manifest emission
  - [x] 6.1 Implement clear-preserve rebuild, file copy, and manifest writing
    - Delete contents of `product-images/` while preserving the folder; copy detected images to slugified destinations preserving extensions
    - Write `scripts/image-manifest.json` (folder counts, per-product records, `kitHeroImages`, summary); log folders processed, files copied, files skipped (mp4 vs other), errors
    - _Requirements: 3.1, 3.2, 3.5, 5.1, 5.2, 5.3, 6.3_
  - [x]* 6.2 Write property test for manifest folder counts
    - **Property 20: Manifest folder counts match the tree**
    - **Validates: Requirements 5.2**
  - [x]* 6.3 Write integration tests on a fixture source tree
    - Verify clear preserves the `product-images/` folder, summary counts are accurate, and the manifest is written with correct product records
    - _Requirements: 3.1, 3.5, 5.1_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Upload script (Supabase transport)
  - [x] 8.1 Implement auth, recursive clear phase, and object-key derivation
    - Create `scripts/upload-images-v2.ts`; load `SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_URL` from `.env.local` and fail fast if missing
    - List all bucket objects recursively; delete in batches of 100; continue on batch error; skip deletes under `--dry-run` and log the would-delete count
    - Derive each object key as the file path relative to `product-images/` using forward slashes
    - _Requirements: 8.1, 8.2, 7.1, 7.2, 7.3, 7.4_
  - [x] 8.2 Implement upload phase with resilient batching
    - Upload every local file in batches of 10 with a 200 ms delay; set `upsert: true` and `contentType` from the extension map; log `uploaded/total`
    - Record `{ path, message }` on failure and continue; write all failures to `scripts/upload-errors.json`; under `--dry-run` log the would-upload count without uploading
    - _Requirements: 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_
  - [x]* 8.3 Write property test for object-key derivation
    - **Property 19: Object key equals the relative POSIX path**
    - **Validates: Requirements 8.2**
  - [x]* 8.4 Write integration tests with a mocked Supabase client
    - Cover recursive listing, delete batches of 100, continue-on-error, upload batches of 10 with delay, `upsert`+`contentType`, progress logging, continue-on-failure, `upload-errors.json`, and dry-run no-op
    - _Requirements: 7.1, 7.2, 7.4, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [x] 9. URL helpers and authored brand-voice copy
  - [x] 9.1 Implement `STORAGE_BASE` and `img()` helper
    - Define `STORAGE_BASE` and `img(path)` (join base with a relative path, strip leading slashes, no double slash) for reuse by the generator and emitted data
    - _Requirements: 13.1, 13.4, 16.4, 24.5_
  - [x] 9.2 Create the authored copy file and price guard
    - Create `scripts/product-copy.ts` (`PRODUCT_COPY` keyed by SKU with `tagline`/`description`), a safe non-empty fallback for missing keys, and a price-token guard (`₹`, `Rs`, `INR`, currency amounts) that fails generation on violation
    - _Requirements: 11.1, 11.2, 11.3_
  - [x]* 9.3 Write property test for URL construction
    - **Property 6: Image URL construction is valid and never stale**
    - **Validates: Requirements 13.1, 13.4, 16.4, 24.5**
  - [x]* 9.4 Write property test for price-free copy
    - **Property 15: Copy never contains price information**
    - **Validates: Requirements 11.3**

- [x] 10. Catalogue generation — identity, ordering, required fields
  - [x] 10.1 Implement manifest ingestion and identity/ordering derivation
    - Create `scripts/generate-catalog.ts`; read `scripts/image-manifest.json`; derive `sku` (`NV-<LETTER>-<NNN>`), `id`=`sku`, cleaned title-cased `name`, globally-unique `slug`, `bucket`; order collection-major (A→K) preserving source order; enforce non-empty required fields; merge authored copy by SKU with fallback
    - _Requirements: 9.1, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4_
  - [x]* 10.2 Write property test for catalogue cardinality
    - **Property 7: Catalogue cardinality matches the manifest**
    - **Validates: Requirements 9.1**
  - [x]* 10.3 Write property test for required non-empty fields
    - **Property 8: Required product fields are always non-empty**
    - **Validates: Requirements 9.3**
  - [x]* 10.4 Write property test for SKU format and uniqueness
    - **Property 9: SKU format and per-collection uniqueness**
    - **Validates: Requirements 10.1, 10.2**
  - [x]* 10.5 Write property test for slug uniqueness and safety
    - **Property 10: Slugs are globally unique and URL-safe**
    - **Validates: Requirements 10.3**
  - [x]* 10.6 Write property test for catalogue ordering
    - **Property 11: Catalogue ordering is collection-major, source-order-minor**
    - **Validates: Requirements 9.4**
  - [x]* 10.7 Write unit tests for name cleaning and minimum entry count
    - Assert source-artefact stripping/title-casing on representative names and that generation yields ≥150 entries over a full fixture
    - _Requirements: 10.4, 9.5_

- [x] 11. Catalogue generation — tags, flags, images, special handling
  - [x] 11.1 Implement tags, personalisation, category, milestone, and featured flags
    - Apply controlled-vocabulary tag rules; always add `Personalizable`+`Made in India`; `H`→`Eco Friendly`; copper/brass/leather/crystal→`Premium`; bottle/mug/tote/tee/hoodie→`Employee Favourite`; `G`→`New`; hamper/curated/box→`Best Seller`
    - Infer `personalisation` from material/type; derive `category`; set `milestone` for collection `B`; set `isFeatured` true for the first two products of each collection
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 14.4, 14.5, 15.2_
  - [x] 11.2 Implement image derivation, kitHeroImages, and cross-collection duplicates
    - Set `imageUrl` = first image of first variant set; `galleryImages` = ordered `img(x)` over all variant sets; build `kitHeroImages` from `ALL KITS` + `EXPERIENCE KITS` heroes; emit one entry per collection for cross-collection duplicates with distinct SKU and description
    - _Requirements: 13.2, 13.3, 15.1, 15.3_
  - [x]* 11.3 Write property test for featured selection
    - **Property 12: Exactly the first two products of each collection are featured**
    - **Validates: Requirements 14.5**
  - [x]* 11.4 Write property test for tag rules
    - **Property 13: Marketing tags obey the controlled-vocabulary rules**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7**
  - [x]* 11.5 Write property test for personalisation inference
    - **Property 14: Personalisation is inferred for every product**
    - **Validates: Requirements 14.4**
  - [x]* 11.6 Write property test for milestone tenure
    - **Property 16: Milestone tenure is set exactly for collection B**
    - **Validates: Requirements 15.2**
  - [x]* 11.7 Write property test for image-field derivation
    - **Property 17: Image fields are derived from the product's images**
    - **Validates: Requirements 13.2, 13.3**
  - [x]* 11.8 Write unit test for cross-collection duplicate distinctness
    - Assert duplicated products yield one entry per collection with distinct SKU and description
    - _Requirements: 15.3_

- [x] 12. Emit data files and update collections
  - [x] 12.1 Emit `src/data/products.ts`
    - Write `STORAGE_BASE`, `img`, `PRODUCTS: readonly Product[]` (one entry per Product_Folder, A→K), and `kitHeroImages: string[]`, importing the existing `Product` type
    - _Requirements: 9.1, 9.2, 9.5, 15.1_
  - [x] 12.2 Emit `src/data/product-images.ts`
    - Write `PRODUCT_IMAGES: Record<string, ProductImageSet>` keyed by SKU with `imageUrl`/`galleryImages`, one key per product SKU and no extra keys, all URLs on the storage base
    - _Requirements: 16.1, 16.2, 16.3, 16.4_
  - [x] 12.3 Verify/update `src/data/buckets.ts`
    - Ensure 11 collections `A`–`K` with mapped display names, premium descriptions, preserved Route_Slugs, and a representative image (first product image, else a `kitHeroImages` entry)
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_
  - [x]* 12.4 Write property test for image-map keys
    - **Property 18: Image map keys equal the catalogue SKUs**
    - **Validates: Requirements 16.1, 16.2, 16.3**
  - [x]* 12.5 Write property test for collection representative images
    - **Property 21: Every collection has a valid representative image**
    - **Validates: Requirements 17.5, 15.1**
  - [x]* 12.6 Write unit tests for collections data
    - Assert 11 entries `A`–`K`, mapped names, and preserved Route_Slugs
    - _Requirements: 17.1, 17.2, 17.4_

- [x] 13. Database migration determination
  - [x] 13.1 Record the static-source determination and skip the migration
    - Confirm public product/collection data is read only via `src/lib/catalog.ts` + `src/data/*`; document the determination in verification notes and skip `017_update_product_catalog.sql`
    - _Requirements: 23.1, 23.2_
  - [x]* 13.2 Write unit test for the determination
    - Assert public pages import from `@/lib/catalog`/`@/data/*` and do not read products/collections from the database
    - _Requirements: 23.1, 23.2_

- [x] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. UI presentation corrections
  - [x] 15.1 Redesign the branded placeholder
    - Update `src/components/products/placeholder-image.tsx` to a centered `Gift` icon on `#FAFAF8` with `#EDE9E3` border, `absolute inset-0` fill, and an accessible label including the product name
    - _Requirements: 22.1, 22.2, 22.3_
  - [x] 15.2 Fix the product card image presentation
    - Update `src/components/products/product-card.tsx`: `aspect-square overflow-hidden rounded-lg`, bg `#FAFAF8`, border `#EDE9E3`, image `object-contain p-3` hover `scale-105`, `next/image` `fill`+`sizes`, `PlaceholderImage` fallback
    - _Requirements: 18.1, 18.2, 18.3, 18.4_
  - [x] 15.3 Fix the product detail gallery
    - Update `src/components/products/product-gallery.tsx`: main image `aspect-square max-w-[600px] object-contain p-6`; thumbnail strip `w-20 h-20 object-contain`; selection swaps main image and sets active border `#C4A35A` / inactive `#EDE9E3`; render no strip when there are no gallery images
    - _Requirements: 19.1, 19.2, 19.3, 19.4_
  - [x] 15.4 Fix the gift-builder compact card and confirm collection page
    - Update `src/components/gift-builder/compact-product-card.tsx` to `object-contain` on `#FAFAF8`/`#EDE9E3` with `PlaceholderImage` fallback; confirm `src/app/(marketing)/collections/[slug]/page.tsx` renders via the fixed `ProductCard` and preserves `generateStaticParams`
    - _Requirements: 20.1, 20.2, 21.1, 21.2_
  - [x]* 15.5 Write UI tests for card, gallery, compact card, collection page, and placeholder
    - Assert container/image classes and colors, placeholder fallback, thumbnail selection/border behaviour, no-strip case, and that the collection page uses `ProductCard`
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 19.1, 19.2, 19.3, 19.4, 20.1, 20.2, 21.1, 22.1, 22.2, 22.3_
  - [x]* 15.6 Write property test for generateStaticParams cardinality
    - **Property 22: generateStaticParams cardinality is exact**
    - **Validates: Requirements 24.4**

- [x] 16. Integrity and build verification
  - [x] 16.1 Implement the storage-path integrity check
    - In `scripts/generate-catalog.ts`, fail generation if any product/image-map URL references a relative storage path absent from the manifest/rebuilt tree
    - _Requirements: 24.3, 24.5_
  - [x]* 16.2 Write property test for absent storage paths
    - **Property 23: No image URL references an absent storage path**
    - **Validates: Requirements 24.3**
  - [x] 16.3 Run type-check and build, resolve any errors
    - Run `tsc --noEmit` (zero errors) and `npm run build` (completes); confirm no URL uses the pre-rebuild `NV-<LETTER><digits>/` layout
    - _Requirements: 24.1, 24.2, 24.5_

- [x] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; core implementation sub-tasks are never optional.
- Implementation language is TypeScript; scripts run via `tsx`, tests via `vitest` + `fast-check` (≥100 iterations per property test, tagged `Feature: image-catalog-rebuild, Property {n}`).
- Each of the design's 23 correctness properties maps to exactly one property-based test sub-task, placed next to the code it validates.
- The Requirement 23 database migration is intentionally skipped (public data is static via `src/lib/catalog.ts`); task 13 records that determination.
- Checkpoints (tasks 7, 14, 17) provide incremental validation gates.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "15.1"] },
    { "id": 2, "tasks": ["3.1", "9.1", "9.2", "8.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "9.3", "9.4", "4.1", "8.2"] },
    { "id": 4, "tasks": ["4.2", "4.3", "8.3", "8.4", "15.2", "15.4"] },
    { "id": 5, "tasks": ["4.4", "5.1", "15.3"] },
    { "id": 6, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 7, "tasks": ["6.2", "6.3", "10.1"] },
    { "id": 8, "tasks": ["10.2", "10.3", "10.4", "10.5", "10.6", "10.7", "11.1"] },
    { "id": 9, "tasks": ["11.2", "11.3", "11.4", "11.5", "11.6"] },
    { "id": 10, "tasks": ["11.7", "11.8", "12.1", "13.1", "13.2"] },
    { "id": 11, "tasks": ["12.2", "12.3", "16.1"] },
    { "id": 12, "tasks": ["12.4", "12.5", "12.6", "16.2", "16.3", "15.5", "15.6"] }
  ]
}
```
