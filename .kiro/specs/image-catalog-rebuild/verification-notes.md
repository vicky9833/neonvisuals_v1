# Verification Notes — Image & Catalogue Rebuild

## Task 13.1 — Database migration determination (Requirement 23)

**Determination: public product and collection data is read only from static data files. The database migration `supabase/migrations/017_update_product_catalog.sql` is intentionally SKIPPED.**

### Requirement 23 acceptance criteria addressed

- **23.1** — Determine whether public product/collection data is read from static files (`src/data/products.ts`) or from the Supabase database.
- **23.2** — IF public data is read only from static files, THEN skip the database migration. ✅ Applied.
- **23.3 / 23.4** — Would only apply if public reads came from the database. They do not, so no `017_update_product_catalog.sql` is generated.

### Evidence — static source of truth for public reads

`src/lib/catalog.ts` is the single public catalogue access layer. Its header states plainly: *"pure functions over the static no-price data layer (src/data/products.ts + src/data/buckets.ts). No Supabase / DB calls."* It composes:

- `PRODUCTS` from `@/data/products`
- `BUCKETS` from `@/data/buckets`
- `PRODUCT_IMAGES` from `@/data/product-images`

and merges image URLs by SKU. There are no Supabase or database calls anywhere in this module.

Every public (marketing) page sources product/collection data through `@/lib/catalog` (which re-exports the static data). Confirmed imports:

| Public page | Imports from |
| --- | --- |
| `src/app/(marketing)/page.tsx` | `PRODUCTS` from `@/lib/catalog` |
| `src/app/(marketing)/products/page.tsx` | `PRODUCTS`, `BUCKETS` from `@/lib/catalog` |
| `src/app/(marketing)/products/[slug]/page.tsx` | `getProductBySlug`, `getRelatedBuckets`, `waProduct`, … from `@/lib/catalog` |
| `src/app/(marketing)/collections/page.tsx` | `BUCKETS`, `getCollectionProductCount` from `@/lib/catalog` |
| `src/app/(marketing)/collections/[slug]/page.tsx` | `getRelatedBuckets`, `waCollection`, … from `@/lib/catalog` |
| `src/app/(marketing)/occasions/[slug]/page.tsx` | `PRODUCTS` from `@/lib/catalog` |
| `src/app/(marketing)/gift-builder/page.tsx` | `BUCKETS` from `@/lib/catalog` |
| `src/app/(marketing)/blog/[slug]/page.tsx` | `getProductBySku` from `@/lib/catalog` |

### Evidence — no Supabase reads on public pages

A search of `src/app/(marketing)/**/*.tsx` for `createClient`, `supabase`, and `.from("products" | "collections" | "buckets")` returned **no matches**. Public pages perform zero database access for products or collections.

### Where the database `products` / `buckets` tables ARE used

Database queries against `products` / `buckets` exist only in **admin / internal / pricing** contexts, which are out of scope for Requirement 23 (they deal with price, COGS, and margin — data that is never shown publicly):

- `src/lib/engines/pricing.ts` — reads `cogs`, `price_single`, `price_bulk_*`, `margin_percent` (quote/pricing only)
- `src/lib/engines/analytics.ts` — reads `sku, cogs`, `wow_score`, `margin_percent` (internal analytics)
- `src/lib/admin/overview.ts` — reads `margin_percent` (admin dashboard)
- `src/lib/admin/products.ts` — admin product CRUD (`products`, `buckets`)

None of these drive public product or collection presentation. The public catalogue is entirely static and no-price by design (see steering: prices are never shown publicly).

### Conclusion

Because all public product and collection reads flow through `src/lib/catalog.ts` → `src/data/*` (static, no database), the condition in **23.2** holds. The database migration `017_update_product_catalog.sql` is intentionally **not created**. Regenerating the static data files (`src/data/products.ts`, `src/data/product-images.ts`, `src/data/buckets.ts`) is sufficient to update the public catalogue; the admin/pricing database schema is unaffected by this rebuild.

Follow-up: optional task 13.2 adds an automated unit test asserting that public pages import from `@/lib/catalog` / `@/data/*` and do not read products/collections from the database.
