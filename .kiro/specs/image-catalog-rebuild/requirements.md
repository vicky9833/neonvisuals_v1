# Requirements Document

## Introduction

This feature rebuilds the entire product image and catalogue data layer for neonvisuals.in from a new authoritative source folder (`neonvisualsfinal/`). It restructures 1,535 source images into a clean, slugified storage tree, uploads them to the Supabase public `product-images` bucket, regenerates the static product catalogue (`src/data/products.ts`), the image map (`src/data/product-images.ts`) and the collections data (`src/data/buckets.ts`), and fixes product image display across cards, the product detail gallery, the gift builder, collection pages, and the branded placeholder.

### Grounding Decisions (reconciliation with the actual codebase)

The feature request describes some paths, field names, and formats that differ from the code as it exists today. The requirements below are grounded in the real code and reconcile the differences explicitly:

1. **Data file locations.** The catalogue files live under `src/data/` (`src/data/products.ts`, `src/data/product-images.ts`, `src/data/buckets.ts`), not `data/`. All requirements target `src/data/`.
2. **Product type field names.** The existing `Product` interface (`src/lib/types/product.ts`) uses `bucket` (a `BucketCode` `"A"`–`"K"`), `tagline`, `description`, `imageUrl`, `galleryImages`, `isFeatured`, `isBestseller`, `isNew`, and an internal-only `basePrice`. It does NOT use `collection`, `shortDescription`, `image`, `gallery`, `category`, `personalisation`, `isActive`, or `milestone`. The request's field names are mapped onto the existing ones (`shortDescription`→`tagline`, `image`→`imageUrl`, `gallery`→`galleryImages`, `collection`→`bucket` + collection lookup), and genuinely new fields (`category`, `personalisation`, `milestone`) are ADDED as optional. No existing field is removed.
3. **Static data is the public source of truth.** Public pages read the catalogue statically through `src/lib/catalog.ts` (which merges `products.ts` with `product-images.ts`). The Supabase database is not the public data source, so the Part 8 database migration is conditional on an explicit determination.
4. **Collection route slugs vs storage slugs.** `buckets.ts` route slugs (`welcome-onboarding`, `milestone-anniversary`, …) drive `/collections/[slug]` URLs and `generateStaticParams`. The request's shorthand slugs (`onboarding`, `milestone`, …) are used for the storage folder path. The two are treated as distinct so existing public URLs are not broken.
5. **Collection letters.** The request's collection→letter mapping (A–K) matches the existing `BucketCode` enum exactly, so the `bucket` field remains `"A"`–`"K"`.
6. **Script execution.** Existing scripts are plain ESM `.mjs`. Running `.ts` scripts requires a TypeScript runner (e.g. `tsx`), which is not currently installed; adding one is in scope.
7. **Image host config.** `next.config.ts` already whitelists the Supabase host and the `product-images/**` path, so new slug-path URLs remain valid for `next/image`.

## Glossary

- **Source_Folder**: The `neonvisualsfinal/` directory placed at the project root; the single source of truth for all products, names, and images (1,535 files across 382 folders).
- **Collection_Folder**: A top-level folder inside Source_Folder mapping to one of the 11 collections (A–K). `ALL KITS` is NOT a collection.
- **Product_Folder**: The folder level that represents a single sellable product — either a level containing only image files, or a level whose immediate subfolders each contain only image files (variant sets / gallery groups). If subfolders themselves contain subfolders, detection recurses deeper.
- **Variant_Set**: A subfolder of a Product_Folder that contains only images and represents one visual grouping of the same product.
- **Storage_Slug**: A collection's short slug used only in storage paths (e.g. `onboarding`, `milestone`, `ceo-leadership`, `festive`, `client`, `experience-kits`, `tech-forward`, `sustainability`, `events`, `college`, `visiting-cards`).
- **Route_Slug**: A collection's slug in `src/data/buckets.ts` used for `/collections/[slug]` public URLs.
- **Restructure_Script**: `scripts/restructure-images.ts`, run via the `restructure-images` npm script.
- **Upload_Script**: `scripts/upload-images-v2.ts`, run via the `upload-images` npm script.
- **Image_Manifest**: `scripts/image-manifest.json`, the full slugified tree with per-folder file counts.
- **Upload_Error_Log**: `scripts/upload-errors.json`, the list of upload failures.
- **Storage_Bucket**: The Supabase public storage bucket named `product-images` (project ref `xserhblhiwtmaiejbvgo`, Mumbai region).
- **Storage_Base**: The constant `https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images`.
- **Product_Catalog**: The static data file `src/data/products.ts` exporting the `PRODUCTS` array.
- **Product_Images_Map**: The static data file `src/data/product-images.ts` exporting the SKU-keyed image map.
- **Collections_Data**: The static data file `src/data/buckets.ts` exporting the `BUCKETS` array.
- **Product_Type**: The `Product` interface in `src/lib/types/product.ts`.
- **Product_Card**: The reusable card component `src/components/products/product-card.tsx`.
- **Compact_Product_Card**: The gift-builder card `src/components/gift-builder/compact-product-card.tsx`.
- **Product_Gallery**: The detail-page gallery `src/components/products/product-gallery.tsx`.
- **Placeholder_Image**: The fallback image component `src/components/products/placeholder-image.tsx`.
- **Slugify**: The transformation that lowercases a path segment, replaces spaces with hyphens, strips characters outside `[a-z0-9-]`, and collapses consecutive hyphens.
- **Kit_Hero_Images**: Lifestyle/hero images sourced from `ALL KITS` and `EXPERIENCE KITS`, exported separately as `kitHeroImages`.
- **Image_Extension**: A supported raster image extension: `.webp`, `.jpg`, `.jpeg`, `.avif`, `.png`.

## Requirements

### Requirement 1: Source folder interpretation and collection mapping

**User Story:** As a catalogue maintainer, I want the tooling to interpret the new source folder's nested structure and map each collection folder to a fixed letter, slug, and display name, so that every product is filed under the correct collection.

#### Acceptance Criteria

1. THE Restructure_Script SHALL map each Collection_Folder to a letter, Storage_Slug, and display name using this fixed table: `ON BOARDING KIT`→(A, `onboarding`, "Welcome & Onboarding"); `MILESTONE AND WORK ANNIVERSARY`→(B, `milestone`); `CEO & LEADERSHIP RECOGNITION`→(C, `ceo-leadership`); `FESTIVE AND SEASONAL`→(D, `festive`); `CLIENT APPRECIATION`→(E, `client`); `EXPERIENCE KITS`→(F, `experience-kits`); `TECH AND DIGITAL FORWARD`→(G, `tech-forward`); `SUSTAINABILITY & ECO`→(H, `sustainability`); `EVENTS AND GENERAL GIFTS`→(I, `events`); `college and events`→(J, `college`); `VISITING CARD`→(K, `visiting-cards`).
2. THE Restructure_Script SHALL treat `ALL KITS` as a source of Kit_Hero_Images and SHALL NOT treat `ALL KITS` as a Collection_Folder.
3. IF Source_Folder contains a top-level folder that does not match the mapping table AND is not `ALL KITS`, THEN THE Restructure_Script SHALL log the unmatched folder name and SHALL exclude the folder from collection output.
4. IF Source_Folder is absent from the project root, THEN THE Restructure_Script SHALL terminate with a descriptive error identifying the missing folder.

### Requirement 2: Product-level folder detection

**User Story:** As a catalogue maintainer, I want a deterministic rule for deciding which folder level is a product, so that flat-image folders, variant-set folders, and deeply nested folders all resolve to the correct number of products.

#### Acceptance Criteria

1. WHERE a folder contains only image files, THE Restructure_Script SHALL classify the folder as a single Product_Folder.
2. WHERE a folder's immediate subfolders each contain only image files, THE Restructure_Script SHALL classify the folder as a single Product_Folder whose subfolders are Variant_Sets.
3. WHERE a folder contains subfolders that themselves contain subfolders, THE Restructure_Script SHALL recurse into each subfolder and repeat Product_Folder detection at the deeper level.
4. WHEN a Product_Folder is detected, THE Restructure_Script SHALL record the collection letter, the Product_Folder path, and the ordered list of Variant_Sets and image files belonging to that product.

### Requirement 3: Rebuild the local product-images folder

**User Story:** As a catalogue maintainer, I want the local `product-images/` folder rebuilt from the new source with a clean slugified structure, so that storage paths are predictable and free of stale content.

#### Acceptance Criteria

1. WHEN the Restructure_Script runs, THE Restructure_Script SHALL delete all existing contents of the local `product-images/` folder while preserving the `product-images/` folder itself.
2. WHEN restructuring, THE Restructure_Script SHALL copy image files from Source_Folder into `product-images/` using the path shape `<collection-storage-slug>/<product-slug>/<variant-slug>/<file>`, omitting the variant segment when a Product_Folder has flat images with no Variant_Set.
3. THE Restructure_Script SHALL preserve each file's original extension.
4. WHEN restructuring the collection `B` (`milestone`), THE Restructure_Script SHALL preserve the tenure subfolder (`one-year`, `five-year`, `ten-year`) as a path segment between the collection segment and the product segment.
5. WHEN the Restructure_Script completes, THE Restructure_Script SHALL log total folders processed, total files copied, total files skipped, and total errors.

### Requirement 4: Slugification of path segments

**User Story:** As a catalogue maintainer, I want every path segment slugified consistently, so that storage paths and generated URLs contain only URL-safe characters.

#### Acceptance Criteria

1. WHEN Slugify transforms a path segment, THE Restructure_Script SHALL convert the segment to lowercase, replace each space with a single hyphen, remove characters outside the set `[a-z0-9-]`, and collapse consecutive hyphens into a single hyphen.
2. WHEN Slugify transforms a file name, THE Restructure_Script SHALL slugify the base name and SHALL retain the original file extension unchanged.
3. IF two files in the same destination folder resolve to the same slugified name, THEN THE Restructure_Script SHALL append a numeric suffix to make the destination name unique and SHALL log the collision.

### Requirement 5: Image manifest generation

**User Story:** As a catalogue maintainer, I want a manifest of the restructured tree, so that I can audit the copy result and drive downstream data generation.

#### Acceptance Criteria

1. WHEN the Restructure_Script completes, THE Restructure_Script SHALL write `scripts/image-manifest.json` describing the full slugified tree.
2. THE Image_Manifest SHALL record, for each folder in the tree, the count of image files directly contained in that folder.
3. THE Image_Manifest SHALL record, for each Product_Folder, the collection letter, the ordered Variant_Sets, and the ordered relative storage paths of the product's images.

### Requirement 6: Special source-file handling

**User Story:** As a catalogue maintainer, I want non-image files handled safely, so that the restructure never fails on video files or unsupported types.

#### Acceptance Criteria

1. WHEN the Restructure_Script encounters a file with an `.mp4` extension, THE Restructure_Script SHALL skip the file, SHALL NOT copy the file, and SHALL log the skipped path.
2. WHEN the Restructure_Script encounters a file whose extension is neither an Image_Extension nor `.mp4`, THE Restructure_Script SHALL skip the file and SHALL log the skipped path with its extension.
3. THE Restructure_Script SHALL count `.mp4` skips separately from other skipped files in its completion summary.

### Requirement 7: Clear the Supabase storage bucket before upload

**User Story:** As a catalogue maintainer, I want the storage bucket emptied before upload, so that no stale objects remain after the rebuild.

#### Acceptance Criteria

1. WHEN the Upload_Script runs without the dry-run flag, THE Upload_Script SHALL list all objects in Storage_Bucket recursively before uploading.
2. WHEN clearing Storage_Bucket, THE Upload_Script SHALL delete objects in batches of 100.
3. WHILE the dry-run flag is set, THE Upload_Script SHALL NOT delete any object from Storage_Bucket.
4. IF a delete batch returns an error, THEN THE Upload_Script SHALL record the error and SHALL continue clearing remaining objects.

### Requirement 8: Upload restructured images to Supabase

**User Story:** As a catalogue maintainer, I want all local images uploaded with correct metadata and resilient batching, so that every product image is available at its predictable public URL.

#### Acceptance Criteria

1. WHEN the Upload_Script runs, THE Upload_Script SHALL authenticate to Supabase using `SUPABASE_SERVICE_ROLE_KEY` read from `.env.local`.
2. WHEN uploading, THE Upload_Script SHALL upload every file under the local `product-images/` folder to Storage_Bucket preserving the exact relative folder path as the object key.
3. WHEN uploading, THE Upload_Script SHALL process files in batches of 10 and SHALL wait 200 milliseconds between batches.
4. WHEN uploading a file, THE Upload_Script SHALL set `upsert` to true and SHALL set the object `contentType` according to the file extension.
5. WHILE uploading, THE Upload_Script SHALL log upload progress including the count of files uploaded and the total count.
6. IF an upload fails, THEN THE Upload_Script SHALL record the file path and error message and SHALL continue with remaining files.
7. WHEN the Upload_Script completes, THE Upload_Script SHALL write all recorded failures to `scripts/upload-errors.json`.
8. WHERE the `--dry-run` flag is provided, THE Upload_Script SHALL log the counts of objects that would be deleted and uploaded without performing any delete or upload.

### Requirement 9: Regenerate the product catalogue entries

**User Story:** As a catalogue maintainer, I want `src/data/products.ts` regenerated so that there is exactly one product entry per detected Product_Folder, so that the catalogue mirrors the new source.

#### Acceptance Criteria

1. THE Product_Catalog SHALL contain exactly one entry per detected Product_Folder across all collections.
2. THE Product_Catalog SHALL export `PRODUCTS` typed as `readonly Product[]` using the existing `Product` type import.
3. THE Product_Catalog SHALL define every entry with non-empty values for `id`, `sku`, `name`, `slug`, `bucket`, `description`, and `imageUrl`.
4. THE Product_Catalog SHALL order entries by collection letter (A→K) and preserve source folder order within each collection.
5. THE Product_Catalog SHALL contain at least 150 entries.

### Requirement 10: Product identity fields (SKU, slug, name)

**User Story:** As a catalogue maintainer, I want each product to have a stable SKU, a URL-safe slug, and a clean display name, so that products are addressable and readable.

#### Acceptance Criteria

1. THE Product_Catalog SHALL assign each product a `sku` of the form `NV-<LETTER>-<NNN>` where `<LETTER>` is the collection letter and `<NNN>` is a zero-padded three-digit sequence unique within the collection.
2. THE Product_Catalog SHALL set each product's `id` equal to its `sku`.
3. THE Product_Catalog SHALL assign each product a `slug` that is unique across all products and contains only characters in the set `[a-z0-9-]`.
4. THE Product_Catalog SHALL derive each product's `name` from the Product_Folder name by cleaning source artefacts and applying title casing.

### Requirement 11: Product copy fields (tagline and description)

**User Story:** As a brand owner, I want each product to carry premium, warm, benefit-focused copy that never mentions price, so that the catalogue matches the Neon Visuals voice.

#### Acceptance Criteria

1. THE Product_Catalog SHALL populate each product's `tagline` (the one-line short description) with premium, warm, benefit-focused text.
2. THE Product_Catalog SHALL populate each product's `description` with two to three sentences in a premium brand voice referencing personalisation, use case, or material.
3. THE Product_Catalog SHALL NOT include any price, currency amount, or cost figure in any `tagline` or `description`.

### Requirement 12: Product tag assignment

**User Story:** As a catalogue maintainer, I want tags assigned from a controlled vocabulary using deterministic rules, so that filtering and badges are consistent.

#### Acceptance Criteria

1. THE Product_Catalog SHALL assign each product's marketing tags only from the set: `Personalizable`, `Best Seller`, `Premium`, `Eco Friendly`, `Made in India`, `Employee Favourite`, `New`, `Limited Edition`.
2. THE Product_Catalog SHALL assign `Personalizable` and `Made in India` to every product.
3. WHERE a product belongs to collection `H` (sustainability), THE Product_Catalog SHALL assign the `Eco Friendly` tag.
4. WHERE a product's material or name indicates copper, brass, leather, or crystal, THE Product_Catalog SHALL assign the `Premium` tag.
5. WHERE a product is a bottle, mug, tote, tee, or hoodie, THE Product_Catalog SHALL assign the `Employee Favourite` tag.
6. WHERE a product belongs to collection `G` (tech-forward), THE Product_Catalog SHALL assign the `New` tag.
7. WHERE a product is a hamper or curated box, THE Product_Catalog SHALL assign the `Best Seller` tag.

### Requirement 13: Product image fields and URL construction

**User Story:** As a catalogue maintainer, I want each product to reference its images through a single storage base and helper, so that every image URL is correct and consistent.

#### Acceptance Criteria

1. THE Product_Catalog SHALL define a `STORAGE_BASE` constant equal to `https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images` and an `img(path)` helper that joins Storage_Base with a relative storage path.
2. THE Product_Catalog SHALL set each product's `imageUrl` to the first image of the product's first Variant_Set.
3. THE Product_Catalog SHALL set each product's `galleryImages` to the ordered list of all images across all of the product's Variant_Sets.
4. THE Product_Catalog SHALL construct every image URL so that it begins with `https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images/` followed by the slugified storage path.

### Requirement 14: Product type preservation and new fields

**User Story:** As a developer, I want the existing `Product` interface preserved and only extended, so that existing code compiles without regressions.

#### Acceptance Criteria

1. THE Product_Type SHALL retain every field currently defined on the `Product` interface.
2. THE Product_Type SHALL add `category` and `personalisation` as optional fields.
3. WHERE the request requires a milestone tenure, THE Product_Type SHALL add an optional `milestone` field constrained to the values `1-year`, `5-year`, and `10-year`.
4. THE Product_Catalog SHALL infer each product's `personalisation` value from the product's material or type.
5. THE Product_Catalog SHALL set `isFeatured` to true for the first two products of each collection and to false for all other products.

### Requirement 15: Special product handling

**User Story:** As a catalogue maintainer, I want hero images, milestone tenures, and cross-collection duplicates handled explicitly, so that special cases render correctly.

#### Acceptance Criteria

1. THE Product_Catalog SHALL export `kitHeroImages` typed as `string[]` containing the image URLs sourced from `ALL KITS` and the hero images of `EXPERIENCE KITS`.
2. WHERE a product belongs to collection `B` (milestone), THE Product_Catalog SHALL set its `milestone` field to `1-year`, `5-year`, or `10-year` according to its tenure subfolder.
3. WHERE the same product appears under more than one Collection_Folder, THE Product_Catalog SHALL create one entry per collection, each with a distinct `sku` and a distinct `description`.

### Requirement 16: Regenerate the product image map

**User Story:** As a developer, I want `src/data/product-images.ts` regenerated to match the new products, so that `src/lib/catalog.ts` continues to merge images by SKU.

#### Acceptance Criteria

1. THE Product_Images_Map SHALL export a SKU-keyed record whose entries each contain an `imageUrl` string and a `galleryImages` string array, matching the existing export shape.
2. THE Product_Images_Map SHALL contain a key for every product SKU present in the Product_Catalog.
3. THE Product_Images_Map SHALL NOT contain any key that is absent from the Product_Catalog.
4. THE Product_Images_Map SHALL set each entry's `imageUrl` and `galleryImages` to URLs beginning with `https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images/`.

### Requirement 17: Update the collections data

**User Story:** As a brand owner, I want all 11 collections verified with correct display names, premium descriptions, and representative images, so that collection pages present accurately.

#### Acceptance Criteria

1. THE Collections_Data SHALL define exactly 11 collections with codes `A` through `K`.
2. THE Collections_Data SHALL set each collection's display `name` to its mapped display name.
3. THE Collections_Data SHALL set each collection's `description` to the provided premium collection copy.
4. THE Collections_Data SHALL retain each collection's existing Route_Slug so that existing `/collections/[slug]` URLs and `generateStaticParams` continue to resolve.
5. THE Collections_Data SHALL associate each collection with a representative image drawn from its first product image, or from Kit_Hero_Images when the collection has no product image.

### Requirement 18: Product card image display

**User Story:** As a shopper, I want product cards to show the full product on a warm neutral background, so that images never crop awkwardly.

#### Acceptance Criteria

1. THE Product_Card SHALL render its image container with `aspect-square`, `overflow-hidden`, `rounded-lg`, background `#FAFAF8`, and border `#EDE9E3`.
2. THE Product_Card SHALL render the product image with `object-contain`, padding `p-3`, and a hover transform of `scale-105`.
3. THE Product_Card SHALL render the image using `next/image` with the `fill` prop and a `sizes` attribute.
4. IF a product has no `imageUrl`, THEN THE Product_Card SHALL render the Placeholder_Image.

### Requirement 19: Product detail page and gallery

**User Story:** As a shopper, I want the product detail page to show a large uncropped main image with a working thumbnail strip, so that I can inspect every product view.

#### Acceptance Criteria

1. THE Product_Gallery SHALL render the main image with `aspect-square`, a maximum width of `600px`, `object-contain`, and padding `p-6`.
2. WHERE a product has gallery images, THE Product_Gallery SHALL render a thumbnail strip whose thumbnails are `w-20 h-20` with `object-contain`.
3. WHEN a thumbnail is selected, THE Product_Gallery SHALL swap the main image to the selected image and SHALL render the active thumbnail with border `#C4A35A` and inactive thumbnails with border `#EDE9E3`.
4. IF a product has no gallery images, THEN THE Product_Gallery SHALL NOT render a thumbnail strip.

### Requirement 20: Gift builder product images

**User Story:** As a gift-kit builder user, I want product images in the builder shown uncropped on the same neutral background, so that the builder matches the catalogue.

#### Acceptance Criteria

1. THE Compact_Product_Card SHALL render the product image with `object-contain` and interior padding on a `#FAFAF8` background with an `#EDE9E3` border.
2. IF a builder product has no `imageUrl`, THEN THE Compact_Product_Card SHALL render the Placeholder_Image.

### Requirement 21: Collection page cards

**User Story:** As a shopper browsing a collection, I want the collection page to use the same fixed product card, so that image presentation is consistent site-wide.

#### Acceptance Criteria

1. THE collection detail page (`src/app/(marketing)/collections/[slug]/page.tsx`) SHALL render products using the fixed Product_Card.
2. THE collection detail page SHALL preserve its existing `generateStaticParams` behaviour over the collection Route_Slugs.

### Requirement 22: Branded placeholder image

**User Story:** As a shopper, I want a consistent branded placeholder when an image is missing, so that empty states still feel premium.

#### Acceptance Criteria

1. THE Placeholder_Image SHALL render a centered Neon Visuals gift icon on a `#FAFAF8` background with an `#EDE9E3` border.
2. THE Placeholder_Image SHALL fill its relatively-positioned parent container.
3. THE Placeholder_Image SHALL expose an accessible label that includes the product name.

### Requirement 23: Supabase seed/migration determination

**User Story:** As a developer, I want the tooling to decide whether a database migration is needed based on how products are actually read, so that database and static data stay consistent without redundant work.

#### Acceptance Criteria

1. WHEN preparing catalogue data, THE feature SHALL determine whether public product and collection data is read from `src/data/products.ts` (static) or from the Supabase database.
2. IF public product and collection data is read only from static data files, THEN THE feature SHALL skip the database migration.
3. IF public product or collection data is read from the Supabase database, THEN THE feature SHALL generate `supabase/migrations/017_update_product_catalog.sql` that clears and upserts the new products and updates the collection descriptions.
4. WHERE the migration is generated, THE migration SHALL use product SKUs consistent with the Product_Catalog.

### Requirement 24: Build and catalogue integrity verification

**User Story:** As a developer, I want the rebuilt catalogue and code to pass type checking and build cleanly with no stale image paths, so that the change is safe to ship.

#### Acceptance Criteria

1. WHEN `tsc --noEmit` runs against the project, THE project SHALL report zero type errors.
2. WHEN `npm run build` runs, THE build SHALL complete successfully.
3. THE Product_Catalog and Product_Images_Map together SHALL contain no image URL that references a storage path absent from the rebuilt `product-images/` tree.
4. WHEN `generateStaticParams` runs for products and collections, THE functions SHALL return one entry per product slug and one entry per collection Route_Slug respectively.
5. THE codebase SHALL contain no product image URL that references the pre-rebuild SKU-folder storage layout (for example `product-images/NV-A14/NV-A14_01.webp`).
