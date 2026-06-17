# Requirements Document

## Introduction

This feature expands the Neon Visuals catalog from 8 to 11 collections by adding three new collections (I, J, K) and 29 new product SKUs, introduces a homepage "time-saver" value-proposition section, updates collection and product count copy across the codebase to reflect the expanded catalog and brand voice, and prepares the `products` table for real product images by adding a nullable `image_url` column. Actual image processing is explicitly deferred and gated behind an explicit request for the source images folder.

All database changes are additive (ALTER/INSERT only). No table is dropped or recreated, Row Level Security (RLS) policies are not modified, and public price protection (enforced at the application layer through static no-price data files) is preserved.

## Glossary

- **Catalog_System**: The product catalog comprising the `buckets` table, the `products` table, and the mirror static data file `src/data/buckets.ts`.
- **Bucket**: A product collection. Internally represented by the `buckets` table and the `bucket_code` enum; presented to the public as a "Collection".
- **Bucket_Code_Enum**: The PostgreSQL enum `bucket_code` defined in `supabase/migrations/001_initial_schema.sql`, currently containing values 'A' through 'H'.
- **Buckets_Table**: The PostgreSQL `buckets` table holding one row per collection.
- **Buckets_Static_File**: The static TypeScript file `src/data/buckets.ts` that mirrors `buckets` table data using the `Bucket` type from `@/lib/types/product`.
- **Products_Table**: The PostgreSQL `products` table defined in `supabase/migrations/001_initial_schema.sql`.
- **Migration_003**: The new migration file `supabase/migrations/003_*.sql` containing all database schema and seed changes for this feature.
- **Seed_File**: The file `supabase/seed.sql` containing product INSERT statements.
- **Homepage**: The marketing homepage rendered by `src/app/(marketing)/page.tsx`.
- **Time_Saver_Section**: A new JSX `<section>` (value_proposition_grid) added to the Homepage, containing 4 cards and a bottom call-to-action (CTA).
- **Collection_I**: New collection with code 'I', name "Events & General Gifts", slug `events-general`, sort_order 9, containing SKUs NV-I01 through NV-I13.
- **Collection_J**: New collection with code 'J', name "College Events", slug `college-events`, sort_order 10, containing SKUs NV-J01 through NV-J08.
- **Collection_K**: New collection with code 'K', name "Visiting Cards & Business Stationery", slug `visiting-cards`, sort_order 11, containing SKUs NV-K01 through NV-K08.

## Requirements

### Requirement 1

**User Story:** As a catalog administrator, I want three new collections added to the catalog database, so that the catalog supports the expanded set of product groupings.

#### Acceptance Criteria

1. THE Migration_003 SHALL extend the Bucket_Code_Enum by adding values 'I', 'J', and 'K' using `ALTER TYPE ... ADD VALUE`.
2. WHERE the Bucket_Code_Enum values 'I', 'J', and 'K' are referenced by INSERT statements, THE Migration_003 SHALL ensure the `ALTER TYPE ... ADD VALUE` statements are committed before the referencing statements execute.
3. THE Migration_003 SHALL insert one row into the Buckets_Table for Collection_I with code 'I', name "Events & General Gifts", slug `events-general`, and sort_order 9.
4. THE Migration_003 SHALL insert one row into the Buckets_Table for Collection_J with code 'J', name "College Events", slug `college-events`, and sort_order 10.
5. THE Migration_003 SHALL insert one row into the Buckets_Table for Collection_K with code 'K', name "Visiting Cards & Business Stationery", slug `visiting-cards`, and sort_order 11.
6. THE Migration_003 SHALL preserve the existing Bucket_Code_Enum values 'A' through 'H' and their corresponding Buckets_Table rows without modification.

### Requirement 2

**User Story:** As a developer, I want the static buckets data file kept in sync with the database, so that the public site and the database present the same collections.

#### Acceptance Criteria

1. THE Buckets_Static_File SHALL include entries for Collection_I, Collection_J, and Collection_K matching the code, name, slug, and sort_order values inserted into the Buckets_Table.
2. THE Buckets_Static_File entries SHALL conform to the `Bucket` type imported from `@/lib/types/product`.
3. THE Buckets_Static_File SHALL retain the existing entries for collections 'A' through 'H' without modification.

### Requirement 3

**User Story:** As a catalog administrator, I want 29 new product SKUs seeded for the new collections, so that the new collections contain on-brand products.

#### Acceptance Criteria

1. THE Migration_003 SHALL insert 13 product rows for Collection_I with SKUs NV-I01 through NV-I13.
2. THE Migration_003 SHALL insert 8 product rows for Collection_J with SKUs NV-J01 through NV-J08.
3. THE Migration_003 SHALL insert 8 product rows for Collection_K with SKUs NV-K01 through NV-K08.
4. THE Migration_003 SHALL associate each new product row with its collection by resolving `bucket_id` via `(SELECT id FROM buckets WHERE code = ...)`.
5. THE Migration_003 SHALL populate each new product row using the Seed_File column pattern: sku, bucket_id, name, slug, tagline, description, who_is_it_for, insight, wow_score, cogs, price_single, price_bulk_25, price_bulk_100, margin_percent, lead_time_days, rush_lead_time_days, moq, materials, personalization_types, occasions, archetypes, tags, recommended_packaging, is_featured, is_bestseller, is_new, and sort_order.
6. THE Migration_003 SHALL set the tagline, description, personalization_types, wow_score, and tags of each new product row to the values specified for that SKU in the feature request.
7. THE Migration_003 SHALL insert new product rows only and SHALL NOT modify or backfill existing products in collections 'A' through 'H'.

### Requirement 4

**User Story:** As a homepage visitor, I want a time-saver section that communicates the platform's value, so that I understand the benefits before contacting the company.

#### Acceptance Criteria

1. THE Homepage SHALL render the Time_Saver_Section as a JSX `<section>` positioned after the how_it_works section and before the testimonials section.
2. THE Time_Saver_Section SHALL display 4 cards, each containing the heading and body copy specified for that card in the feature request.
3. THE Time_Saver_Section SHALL display a bottom CTA containing the label and destination specified in the feature request.
4. THE Time_Saver_Section SHALL follow the existing inline-array rendering pattern and `Reveal` fade-in component used by the Homepage.
5. THE Time_Saver_Section SHALL apply the established Neon Visuals brand styling for typography, color, and card treatment.

### Requirement 5

**User Story:** As a content owner, I want collection and product count copy updated across the codebase, so that public copy reflects the expanded catalog and the brand voice.

#### Acceptance Criteria

1. WHERE codebase copy states "8 collections" or "8 buckets", THE Catalog_System SHALL present the copy as "11 collections".
2. WHERE codebase copy states "100+ products", THE Catalog_System SHALL present the copy as "130+ products".
3. WHERE public-facing copy refers to a collection, THE Catalog_System SHALL use the term "Collection" rather than "Bucket".
4. WHERE public-facing copy refers to a product kit, THE Catalog_System SHALL use the term "Experience Kit" rather than "Hamper".
5. WHERE public-facing copy refers to price, THE Catalog_System SHALL use the term "Investment" rather than "Cost".

### Requirement 6

**User Story:** As a developer, I want the products table prepared for real images without changing existing image fields, so that image data can be added later without rework.

#### Acceptance Criteria

1. THE Migration_003 SHALL add a nullable `image_url TEXT` column to the Products_Table via `ALTER TABLE`.
2. THE Migration_003 SHALL leave the existing `images TEXT[]` and `thumbnail_url TEXT` columns of the Products_Table unchanged.
3. THE Catalog_System SHALL defer image processing and SHALL NOT populate the `image_url` column during this feature.
4. WHEN image processing is requested, THE Catalog_System SHALL require the source images folder to be provided before processing any images.

### Requirement 7

**User Story:** As a platform owner, I want all catalog changes to be additive and safe, so that existing data, access controls, and price protection are preserved.

#### Acceptance Criteria

1. THE Migration_003 SHALL use only `ALTER` and `INSERT` statements for schema and data changes and SHALL NOT drop or recreate the Buckets_Table or the Products_Table.
2. THE Catalog_System SHALL leave the Products_Table RLS policy `FOR SELECT USING (true)` unchanged.
3. THE Catalog_System SHALL keep product price columns hidden from public reads by continuing to serve public data from static no-price data files.
4. THE Migration_003 SHALL be created as a new migration file `supabase/migrations/003_*.sql` alongside the existing `001` and `002` migration files.
