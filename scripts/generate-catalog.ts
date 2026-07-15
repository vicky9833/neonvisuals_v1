/**
 * Catalogue generation script for the image & catalogue rebuild pipeline.
 *
 * Reads `scripts/image-manifest.json` (produced by the restructure step) and
 * derives the static product catalogue that will be emitted to
 * `src/data/products.ts` / `src/data/product-images.ts`.
 *
 * This file is built up incrementally across several spec tasks and is
 * structured as a set of exported pure functions so the property/unit tests
 * (tasks 10.2–10.7, 11.x, 16.x) can import and exercise them without any
 * filesystem side effects. Importing this module never requires the manifest
 * file to exist — {@link main} only runs when the module is executed directly.
 *
 * Task 10.1 scope (identity, ordering, required fields):
 *   - {@link deriveSku}    — `NV-<LETTER>-<NNN>` SKU construction.
 *   - {@link cleanName}    — Product_Folder name → cleaned, title-cased name.
 *   - {@link buildCatalog} — ingest a manifest → ordered, identity-complete
 *                            products with authored/fallback copy merged in.
 *
 * Task 11.1 scope (tags, personalisation, category, milestone, featured):
 *   - {@link deriveTags}           — controlled-vocabulary marketing tags.
 *   - {@link inferPersonalisation} — material/type → personalisation method.
 *   - {@link deriveCategory}       — coarse category keyword bucketing.
 *   - {@link deriveMilestone}      — collection-B milestone tenure.
 *   - {@link buildCatalog}         — sets `isFeatured` for the first two
 *                                    products of each collection.
 *
 * Task 11.2 scope (image derivation, kit hero images, cross-collection dupes):
 *   - {@link deriveImageUrl}      — imageUrl = first image of the first variant set.
 *   - {@link deriveGalleryImages} — ordered `img(x)` over all variant sets.
 *   - {@link buildKitHeroImages}  — ALL KITS + EXPERIENCE KITS (collection F) heroes.
 *   - {@link findCrossCollectionDuplicates} / {@link assertCrossCollectionDistinct}
 *                                 — one entry per collection with distinct SKU
 *                                   and distinct description.
 *   - {@link CatalogBuildResult}  — now also exposes `kitHeroImages`.
 *
 * Task 12.1 scope (emit src/data/products.ts):
 *   - {@link renderProductsFile} — pure serializer: catalogue → exact
 *                                  `src/data/products.ts` source text (imports
 *                                  the `Product` type, re-exports `STORAGE_BASE`
 *                                  and `img`, emits `PRODUCTS` and `kitHeroImages`).
 *   - {@link emitProductsFile}    — writes the rendered source to disk; invoked
 *                                  only by {@link main} on direct execution so the
 *                                  committed data file is never touched on import,
 *                                  build, or test.
 *
 * Task 12.2 scope (emit src/data/product-images.ts):
 *   - {@link renderProductImagesFile} — pure serializer: catalogue → exact
 *                                  `src/data/product-images.ts` source text
 *                                  (`ProductImageSet` interface + SKU-keyed
 *                                  `PRODUCT_IMAGES`, one key per SKU, no extras,
 *                                  every URL re-expressed via the `img` helper).
 *   - {@link emitProductImagesFile} — writes the rendered source to disk; invoked
 *                                  only by {@link main} on direct execution so the
 *                                  committed data file is never touched on import,
 *                                  build, or test.
 *
 * Task 16.1 scope (storage-path integrity check):
 *   - {@link collectManifestStoragePaths} — the set of valid object keys.
 *   - {@link relativeStoragePath}          — URL → relative storage path.
 *   - {@link STALE_SKU_FOLDER_RE}          — pre-rebuild layout guard (Req 24.5).
 *   - {@link assertNoAbsentStoragePaths}   — fails generation when any product/
 *                                            image-map URL references an absent
 *                                            path or the stale layout (Req 24.3,
 *                                            24.5); wired into {@link main}
 *                                            before any file is emitted. Exported
 *                                            so property test 16.2 (Property 23)
 *                                            can import it.
 *
 * Requirements: 9.1, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4, 12.1, 12.2, 12.3, 12.4,
 * 12.5, 12.6, 12.7, 13.2, 13.3, 14.4, 14.5, 15.1, 15.2, 15.3, 24.3, 24.5
 */

import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { BucketCode, MilestoneTenure, Product } from "../src/lib/types/product";
import {
  COLLECTION_MAP,
  MANIFEST_PATH,
  slugify,
  type ImageManifest,
  type ManifestProduct,
} from "./restructure-images";
import { assertAllCopyPriceFree, getProductCopy } from "./product-copy";
import { img, STORAGE_BASE } from "./storage-url";

/* -------------------------------------------------------------------------- */
/* Collection display-name lookup (letter → display name)                     */
/* -------------------------------------------------------------------------- */

/**
 * Reverse of {@link COLLECTION_MAP}: maps a bucket letter (`"A"`–`"K"`) to its
 * human-facing display name. Used to give fallback copy the collection context
 * (see {@link getProductCopy}).
 */
export const DISPLAY_NAME_BY_LETTER: Readonly<Record<string, string>> = (() => {
  const map: Record<string, string> = {};
  for (const entry of Object.values(COLLECTION_MAP)) {
    map[entry.letter] = entry.displayName;
  }
  return map;
})();

/** The display name for a collection letter, or `undefined` when unknown. */
export function getCollectionDisplayName(letter: BucketCode): string | undefined {
  return DISPLAY_NAME_BY_LETTER[letter];
}

/* -------------------------------------------------------------------------- */
/* Identity derivation — SKU (Requirements 10.1, 10.2)                        */
/* -------------------------------------------------------------------------- */

/**
 * Build a product SKU of the form `NV-<LETTER>-<NNN>` (Requirement 10.1).
 *
 * `<LETTER>` is the collection letter and `<NNN>` is the zero-padded three-digit
 * sequence number, unique within the collection. Sequence numbers start at 1 and
 * are assigned in catalogue order (collection-major, source-order-minor).
 *
 * @param letter    Collection letter `"A"`–`"K"`.
 * @param sequence  One-based sequence number within the collection.
 * @returns         The SKU string, e.g. `"NV-A-001"`.
 */
export function deriveSku(letter: BucketCode, sequence: number): string {
  return `NV-${letter}-${String(sequence).padStart(3, "0")}`;
}

/* -------------------------------------------------------------------------- */
/* Name cleaning and title-casing (Requirement 10.4)                          */
/* -------------------------------------------------------------------------- */

/**
 * Title-case a space-separated phrase: each word's first character is
 * upper-cased and the remainder lower-cased. Empty words are dropped.
 */
function titleCase(phrase: string): string {
  return phrase
    .split(" ")
    .filter((word) => word.length > 0)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Derive a clean, title-cased display `name` from a Product_Folder name
 * (Requirement 10.4).
 *
 * Cleaning steps:
 *   1. Replace path separators and underscores with spaces.
 *   2. Remove characters outside letters, digits, spaces, `&`, and `-`
 *      (drops stray tokens such as trailing `+`).
 *   3. Strip trailing "set N" / "setN" variant-group artefacts (e.g.
 *      `"Brass Pen Stand Set 1"` → `"Brass Pen Stand"`), repeated as needed.
 *   4. Collapse whitespace and title-case the result.
 *
 * If cleaning would remove everything, the pre-strip cleaned phrase is used so
 * the name is never empty (supports the non-empty guarantee of Req 9.3).
 *
 * @param raw  The raw Product_Folder name (typically the source folder basename).
 * @returns    The cleaned, title-cased display name.
 */
export function cleanName(raw: string): string {
  const normalised = raw
    .replace(/[_/\\]+/g, " ") // separators → space
    .replace(/[^A-Za-z0-9&\- ]+/g, " ") // drop stray tokens/symbols
    .replace(/\s+/g, " ")
    .trim();

  // Strip trailing "set N" / "setN" artefacts, possibly repeated.
  let cleaned = normalised;
  let stripped = cleaned.replace(/\s*\bset\s*\d+\s*$/i, "").trim();
  while (stripped !== cleaned) {
    cleaned = stripped;
    stripped = cleaned.replace(/\s*\bset\s*\d+\s*$/i, "").trim();
  }

  const source = cleaned.length > 0 ? cleaned : normalised;
  return titleCase(source);
}

/* -------------------------------------------------------------------------- */
/* Marketing tags (Requirement 12)                                            */
/* -------------------------------------------------------------------------- */

/**
 * The controlled marketing-tag vocabulary (Requirement 12.1). Every tag emitted
 * by {@link deriveTags} is drawn from this set, and the array is used as the
 * canonical ordering so tag output is deterministic.
 */
export const MARKETING_TAGS = [
  "Personalizable",
  "Best Seller",
  "Premium",
  "Eco Friendly",
  "Made in India",
  "Employee Favourite",
  "New",
  "Limited Edition",
] as const;

/** A single controlled marketing tag. */
export type MarketingTag = (typeof MARKETING_TAGS)[number];

/** Word-boundary keyword signals used by the tag / personalisation rules. */
const PREMIUM_MATERIAL_RE = /\b(?:copper|brass|leather|crystal)\b/;
const EMPLOYEE_FAVOURITE_RE =
  /\b(?:bottles?|mugs?|totes?|tees?|t-?shirts?|hoodies?)\b/;
const BEST_SELLER_RE = /\b(?:hamper|curated|box(?:es)?)\b/;

/**
 * Derive a product's marketing tags from the controlled vocabulary using the
 * deterministic rules of Requirement 12.
 *
 * Rules:
 *   - `Personalizable` and `Made in India` on every product (12.2).
 *   - collection `H` → `Eco Friendly` (12.3).
 *   - copper/brass/leather/crystal signal in the name → `Premium` (12.4).
 *   - bottle/mug/tote/tee/t-shirt/hoodie signal → `Employee Favourite` (12.5).
 *   - collection `G` → `New` (12.6).
 *   - hamper/curated/box signal → `Best Seller` (12.7).
 *
 * Every returned tag is a member of {@link MARKETING_TAGS} (12.1) and the result
 * is ordered by the canonical vocabulary order for reproducibility.
 *
 * @param name    The product's display or source name (matched case-insensitively).
 * @param letter  The owning collection letter `"A"`–`"K"`.
 * @returns       The ordered, de-duplicated list of applicable marketing tags.
 */
export function deriveTags(name: string, letter: BucketCode): MarketingTag[] {
  const haystack = name.toLowerCase();
  const selected = new Set<MarketingTag>();

  // Always present (12.2).
  selected.add("Personalizable");
  selected.add("Made in India");

  if (letter === "H") selected.add("Eco Friendly"); // 12.3
  if (PREMIUM_MATERIAL_RE.test(haystack)) selected.add("Premium"); // 12.4
  if (EMPLOYEE_FAVOURITE_RE.test(haystack)) selected.add("Employee Favourite"); // 12.5
  if (letter === "G") selected.add("New"); // 12.6
  if (BEST_SELLER_RE.test(haystack)) selected.add("Best Seller"); // 12.7

  // Emit in canonical vocabulary order for deterministic output.
  return MARKETING_TAGS.filter((tag) => selected.has(tag));
}

/* -------------------------------------------------------------------------- */
/* Personalisation inference (Requirement 14.4)                               */
/* -------------------------------------------------------------------------- */

/**
 * Infer a product's personalisation method from its material/type keywords
 * (Requirement 14.4). Always returns a non-empty method.
 *
 * Priority (first match wins):
 *   1. leather                                   → `emboss`
 *   2. metal/hard materials (copper, brass,
 *      steel, metal, aluminium, crystal, marble) → `laser_engrave`
 *   3. apparel (tee, t-shirt, hoodie, cap, tote,
 *      apparel)                                  → `embroidery`
 *   4. paper goods (notebook, diary, journal,
 *      paper, card, booklet)                     → `foil`
 *   5. default                                   → `print`
 *
 * @param name  The product's display or source name (matched case-insensitively).
 * @returns     A non-empty personalisation method string.
 */
export function inferPersonalisation(name: string): string {
  const haystack = name.toLowerCase();

  if (/\bleather\b/.test(haystack)) return "emboss";
  if (/\b(?:copper|brass|steel|metal|aluminium|crystal|marble)\b/.test(haystack)) {
    return "laser_engrave";
  }
  if (/\b(?:tees?|t-?shirts?|hoodies?|caps?|totes?|apparel)\b/.test(haystack)) {
    return "embroidery";
  }
  if (/\b(?:notebooks?|diar(?:y|ies)|journals?|paper|cards?|booklets?)\b/.test(haystack)) {
    return "foil";
  }
  return "print";
}

/* -------------------------------------------------------------------------- */
/* Category derivation (Requirement 14.2)                                     */
/* -------------------------------------------------------------------------- */

/** Ordered (first-match-wins) category keyword buckets. */
const CATEGORY_RULES: ReadonlyArray<{ category: string; pattern: RegExp }> = [
  { category: "Drinkware", pattern: /\b(?:bottles?|mugs?|flasks?|tumblers?|cups?|decanters?|glass(?:es)?)\b/ },
  { category: "Awards", pattern: /\b(?:awards?|troph(?:y|ies)|plaques?)\b/ },
  { category: "Apparel", pattern: /\b(?:tees?|t-?shirts?|hoodies?|caps?|jackets?|apparel)\b/ },
  { category: "Bags", pattern: /\b(?:totes?|backpacks?|bags?|pouch(?:es)?)\b/ },
  { category: "Tech", pattern: /\b(?:chargers?|speakers?|earbuds?|headphones?|power|cables?|wireless|mouse|keyboards?|tech)\b/ },
  { category: "Stationery", pattern: /\b(?:pens?|notebooks?|diar(?:y|ies)|journals?|stationery|booklets?)\b/ },
  { category: "Desk", pattern: /\b(?:desk|stands?|holders?|organi[sz]ers?|clocks?|frames?|planters?|succulents?)\b/ },
  { category: "Wellness", pattern: /\b(?:candles?|spa|wellness|tea|coffee|aroma)\b/ },
  { category: "Home", pattern: /\b(?:coasters?|marble|cushions?|home)\b/ },
  { category: "Hamper", pattern: /\b(?:hamper|curated|box(?:es)?|kits?|sets?)\b/ },
];

/**
 * Derive a coarse product `category` from name/type keyword bucketing
 * (Requirement 14.2). Returns a stable first-match category, or the generic
 * `"Gifting"` when nothing matches, so the value is always non-empty.
 *
 * @param name  The product's display or source name (matched case-insensitively).
 * @returns     A non-empty coarse category label.
 */
export function deriveCategory(name: string): string {
  const haystack = name.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(haystack)) return rule.category;
  }
  return "Gifting";
}

/* -------------------------------------------------------------------------- */
/* Milestone tenure (Requirement 15.2)                                        */
/* -------------------------------------------------------------------------- */

/**
 * Resolve a product's milestone tenure (Requirement 15.2). The tenure is only
 * meaningful for collection `B`; for every other collection this returns
 * `undefined` so the `milestone` field is absent (Property 16).
 *
 * @param letter          The owning collection letter.
 * @param manifestTenure  The tenure recorded on the manifest product (collection
 *                        `B` only).
 * @returns               The milestone tenure for collection `B`, else `undefined`.
 */
export function deriveMilestone(
  letter: BucketCode,
  manifestTenure: MilestoneTenure | undefined,
): MilestoneTenure | undefined {
  return letter === "B" ? manifestTenure : undefined;
}

/* -------------------------------------------------------------------------- */
/* Image-field derivation (Requirements 13.2, 13.3)                           */
/* -------------------------------------------------------------------------- */

/**
 * Derive a product's `imageUrl` from its ordered image paths (Requirement 13.2).
 *
 * The manifest records each product's images in variant-set-major order (every
 * image of the first variant set, then the second, …), so `images[0]` is the
 * first image of the product's first Variant_Set. The relative path is wrapped
 * with {@link img} to produce the fully-qualified storage URL.
 *
 * @param images  The product's ordered relative storage paths (from the manifest).
 * @returns       The primary image URL, or `undefined` when the product has no
 *                images (callers enforce the non-empty requirement — Req 9.3).
 */
export function deriveImageUrl(images: readonly string[]): string | undefined {
  const first = images[0];
  return first !== undefined ? img(first) : undefined;
}

/**
 * Derive a product's `galleryImages` from its ordered image paths
 * (Requirement 13.3).
 *
 * Returns the ordered list of every image across all of the product's Variant_Sets
 * (the manifest's `images` array preserves variant-set-major order), each wrapped
 * with {@link img}. For a flat-image product this is simply its images in order;
 * for a variant-set product it is the concatenation of each variant set's images.
 *
 * @param images  The product's ordered relative storage paths (from the manifest).
 * @returns       The ordered gallery image URLs (possibly empty).
 */
export function deriveGalleryImages(images: readonly string[]): string[] {
  // Deduplicate the emitted gallery URLs while preserving first-seen order so
  // the same storage URL is never rendered twice (avoids React duplicate-key
  // warnings downstream). imageUrl derivation is unaffected.
  return [...new Set(images.map((path) => img(path)))];
}

/* -------------------------------------------------------------------------- */
/* Kit hero images (Requirement 15.1)                                         */
/* -------------------------------------------------------------------------- */

/**
 * Assemble the exported `kitHeroImages` list (Requirement 15.1).
 *
 * The list is built from two sources, in order, and then de-duplicated while
 * preserving first-seen order:
 *   1. Every image sourced from `ALL KITS` — the manifest records these as
 *      relative storage paths in `manifest.kitHeroImages`; each is wrapped with
 *      {@link img} to become a fully-qualified URL.
 *   2. The hero image of every `EXPERIENCE KITS` product — collection `F`. Each
 *      such product's `imageUrl` (the first image of its first Variant_Set) is
 *      its hero image.
 *
 * Every returned URL therefore begins with `${STORAGE_BASE}/` (Req 13.4, 16.4).
 *
 * @param manifest  The parsed {@link ImageManifest} (supplies `ALL KITS` paths).
 * @param products  The built catalogue products (supplies collection-`F` heroes).
 * @returns         The ordered, de-duplicated kit hero image URLs.
 */
export function buildKitHeroImages(
  manifest: ImageManifest,
  products: readonly Product[],
): string[] {
  const heroes: string[] = [];

  // 1. ALL KITS images — relative paths → fully-qualified URLs.
  for (const relPath of manifest.kitHeroImages) {
    heroes.push(img(relPath));
  }

  // 2. EXPERIENCE KITS (collection F) product hero images.
  for (const product of products) {
    if (product.bucket === "F" && product.imageUrl !== undefined) {
      heroes.push(product.imageUrl);
    }
  }

  // De-duplicate while preserving first-seen order.
  return [...new Set(heroes)];
}

/* -------------------------------------------------------------------------- */
/* Cross-collection duplicate handling (Requirement 15.3)                     */
/* -------------------------------------------------------------------------- */

/**
 * Compute the duplicate-detection key for a product. The same physical product
 * appearing under more than one Collection_Folder resolves to the same cleaned,
 * title-cased `name`, so a case-insensitive `name` comparison groups the
 * duplicates together regardless of collection.
 */
export function duplicateKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Group products that appear under more than one collection (Requirement 15.3).
 *
 * Products are grouped by {@link duplicateKey}; only groups whose members span
 * more than one distinct `bucket` are returned (a repeated name inside a single
 * collection is not a cross-collection duplicate). Group order and each group's
 * internal order follow the input (catalogue) order.
 *
 * @param products  The built catalogue products.
 * @returns         A map from duplicate key to the products sharing it across
 *                  collections. Empty when there are no cross-collection duplicates.
 */
export function findCrossCollectionDuplicates(
  products: readonly Product[],
): Map<string, Product[]> {
  const byKey = new Map<string, Product[]>();
  for (const product of products) {
    const key = duplicateKey(product.name);
    const group = byKey.get(key);
    if (group) {
      group.push(product);
    } else {
      byKey.set(key, [product]);
    }
  }

  const crossCollection = new Map<string, Product[]>();
  for (const [key, group] of byKey) {
    const buckets = new Set(group.map((product) => product.bucket));
    if (buckets.size > 1) {
      crossCollection.set(key, group);
    }
  }
  return crossCollection;
}

/**
 * Guarantee that every cross-collection duplicate has a distinct `description`
 * (Requirement 15.3). SKUs are already globally unique by construction
 * (per-collection sequence + letter), so this only needs to differentiate copy.
 *
 * When two members of a duplicate group share an identical description (e.g. two
 * products that both fell back to generated copy with the same collection
 * context), a brand-voice collection clause is appended to the later member so
 * every description in the group is unique. Authored per-SKU copy that is already
 * distinct is left untouched.
 *
 * Mutates the passed products in place.
 */
function ensureDistinctCrossCollectionDescriptions(products: readonly Product[]): void {
  for (const group of findCrossCollectionDuplicates(products).values()) {
    const seen = new Set<string>();
    for (const product of group) {
      let description = product.description;
      if (seen.has(description)) {
        const displayName = getCollectionDisplayName(product.bucket);
        const clause = displayName ? ` Curated for our ${displayName} collection.` : ` (${product.sku}).`;
        description = `${description}${clause}`;
        // In the unlikely event the clause still collides, fall back to the SKU.
        if (seen.has(description)) {
          description = `${product.description} (${product.sku}).`;
        }
        product.description = description;
      }
      seen.add(description);
    }
  }
}

/**
 * Assert that every cross-collection duplicate yields one entry per collection
 * with a distinct `sku` and a distinct `description` (Requirement 15.3).
 *
 * Throws a descriptive generation error if any duplicate group contains a
 * repeated SKU or a repeated description. Exposed so the cross-collection
 * distinctness unit test (task 11.8) can exercise it directly.
 */
export function assertCrossCollectionDistinct(products: readonly Product[]): void {
  for (const [key, group] of findCrossCollectionDuplicates(products)) {
    const skus = group.map((product) => product.sku);
    if (new Set(skus).size !== skus.length) {
      throw new Error(
        `Cross-collection duplicate "${key}" has a repeated SKU (${skus.join(", ")}); ` +
          `each collection entry must have a distinct SKU (Requirement 15.3).`,
      );
    }
    const descriptions = group.map((product) => product.description);
    if (new Set(descriptions).size !== descriptions.length) {
      throw new Error(
        `Cross-collection duplicate "${key}" (${skus.join(", ")}) has a repeated description; ` +
          `each collection entry must have a distinct description (Requirement 15.3).`,
      );
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Manifest ingestion (Requirement 9.1, 9.4)                                  */
/* -------------------------------------------------------------------------- */

/**
 * Order a manifest's products collection-major (A→K), preserving each product's
 * source folder order within its collection (Requirement 9.4).
 *
 * The manifest is already produced in this order by the restructure step; this
 * re-sort makes the ordering guarantee explicit and robust to manifest input
 * order. `Array.prototype.sort` is stable, so products sharing a collection
 * letter keep their original relative order.
 */
export function orderManifestProducts(
  products: readonly ManifestProduct[],
): ManifestProduct[] {
  return [...products].sort((a, b) => {
    if (a.collectionLetter < b.collectionLetter) return -1;
    if (a.collectionLetter > b.collectionLetter) return 1;
    return 0;
  });
}

/* -------------------------------------------------------------------------- */
/* Per-product derivation (identity, required fields, copy merge)             */
/* -------------------------------------------------------------------------- */

/** The result of building the catalogue from a manifest. */
export interface CatalogBuildResult {
  /** Products ordered collection-major (A→K), source-order-minor. */
  products: Product[];
  /**
   * Kit hero image URLs from `ALL KITS` + `EXPERIENCE KITS` heroes
   * (Requirement 15.1). Emitted to `src/data/products.ts` as `kitHeroImages`.
   */
  kitHeroImages: string[];
  /** SKUs that fell back to generated copy (flagged for follow-up authoring). */
  fallbackCopySkus: string[];
}

/**
 * Assert that a required product field is a non-empty string (Requirement 9.3),
 * throwing a descriptive generation error otherwise.
 */
function assertNonEmpty(
  value: string | undefined,
  field: string,
  sku: string,
): asserts value is string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(
      `Catalogue generation failed for ${sku}: required field "${field}" is empty ` +
        `(Requirement 9.3). Every product must define non-empty id, sku, name, slug, ` +
        `bucket, description, and imageUrl.`,
    );
  }
}

/**
 * Build the product catalogue from an image manifest (task 10.1 scope).
 *
 * For each detected Product_Folder, in catalogue order (collection-major A→K,
 * source-order-minor — Req 9.4), this derives:
 *   - `sku` (`NV-<LETTER>-<NNN>`, per-collection sequence) and `id` = `sku`
 *     (Req 10.1, 10.2);
 *   - a cleaned, title-cased `name` from the source folder name (Req 10.4);
 *   - a globally-unique, URL-safe `slug` (Req 10.3);
 *   - `bucket` from the collection letter (Req 9.3);
 *   - `imageUrl` from the first image of the first variant set and
 *     `galleryImages` from every image across all variant sets (task 11.2 —
 *     Req 13.2, 13.3);
 *   - `tagline` / `description` merged from authored copy by SKU, with a safe
 *     non-empty brand-voice fallback (Req 9.3, and copy tasks 11.x).
 *
 * Exactly one entry is produced per Product_Folder (Req 9.1). Required fields
 * are enforced non-empty (Req 9.3). The authored copy map is validated
 * price-free before use (Req 11.3).
 *
 * Marketing `tags`, `personalisation`, `category`, `milestone` (collection B),
 * and the `isFeatured` flag (first two products of each collection) are derived
 * per-product here (task 11.1 — Req 12.x, 14.4, 14.5, 15.2).
 *
 * After the per-product pass (task 11.2 — Req 15.1, 15.3): cross-collection
 * duplicates are given distinct descriptions and asserted to have distinct SKUs
 * and descriptions, and `kitHeroImages` is assembled from `ALL KITS` +
 * `EXPERIENCE KITS` (collection F) heroes.
 *
 * @param manifest  The parsed {@link ImageManifest}.
 * @returns         The ordered products, `kitHeroImages`, and the SKUs using
 *                  fallback copy.
 */
export function buildCatalog(manifest: ImageManifest): CatalogBuildResult {
  // Fail fast if any authored copy contains price information (Req 11.3).
  assertAllCopyPriceFree();

  const ordered = orderManifestProducts(manifest.products);

  const products: Product[] = [];
  const fallbackCopySkus: string[] = [];
  const sequenceByLetter = new Map<BucketCode, number>();
  const usedSlugs = new Set<string>();

  for (const manifestProduct of ordered) {
    const letter = manifestProduct.collectionLetter;

    // Per-collection sequence → SKU / id (Req 10.1, 10.2).
    const nextSequence = (sequenceByLetter.get(letter) ?? 0) + 1;
    sequenceByLetter.set(letter, nextSequence);
    const sku = deriveSku(letter, nextSequence);

    // Cleaned, title-cased name from the source folder name (Req 10.4).
    const rawName = basename(manifestProduct.sourcePath);
    const name = cleanName(rawName);

    // Globally-unique, URL-safe slug (Req 10.3).
    const slug = allocateUniqueSlug(name, manifestProduct.productSlug, usedSlugs);

    // Image fields (Req 13.2, 13.3): imageUrl = first image of the first variant
    // set; galleryImages = every image across all variant sets, in order.
    const imageUrl = deriveImageUrl(manifestProduct.images);
    const galleryImages = deriveGalleryImages(manifestProduct.images);

    // Merge authored copy by SKU with a safe non-empty fallback (Req 9.3, 11.x).
    const { copy, usedFallback } = getProductCopy(
      sku,
      name,
      getCollectionDisplayName(letter),
    );
    if (usedFallback) {
      fallbackCopySkus.push(sku);
    }

    // Marketing tags, personalisation, category, milestone, and featured flag
    // (task 11.1 — Requirements 12.x, 14.4, 14.5, 15.2). Match rules against the
    // cleaned display name (source folder basename → cleaned name).
    const tags = deriveTags(name, letter);
    const personalisation = inferPersonalisation(name);
    const category = deriveCategory(name);
    const milestone = deriveMilestone(letter, manifestProduct.milestone);
    // First two products of each collection are featured (Req 14.5). At this
    // point `nextSequence` is the 1-based per-collection position in source order.
    const isFeatured = nextSequence <= 2;

    const product: Product = {
      id: sku,
      sku,
      name,
      slug,
      bucket: letter,
      tagline: copy.tagline,
      description: copy.description,
      imageUrl,
      galleryImages,
      tags,
      personalisation,
      category,
      isFeatured,
    };
    // Milestone tenure is set exactly for collection B (Req 15.2, Property 16).
    if (milestone !== undefined) {
      product.milestone = milestone;
    }

    // Enforce non-empty required fields (Req 9.3).
    assertNonEmpty(product.id, "id", sku);
    assertNonEmpty(product.sku, "sku", sku);
    assertNonEmpty(product.name, "name", sku);
    assertNonEmpty(product.slug, "slug", sku);
    assertNonEmpty(product.bucket, "bucket", sku);
    assertNonEmpty(product.description, "description", sku);
    assertNonEmpty(product.imageUrl, "imageUrl", sku);

    products.push(product);
  }

  // Cross-collection duplicates: one entry per collection, each with a distinct
  // SKU (guaranteed by per-collection sequencing) and a distinct description
  // (Requirement 15.3). Differentiate any colliding descriptions, then assert.
  ensureDistinctCrossCollectionDescriptions(products);
  assertCrossCollectionDistinct(products);

  // kitHeroImages from ALL KITS + EXPERIENCE KITS (collection F) heroes (Req 15.1).
  const kitHeroImages = buildKitHeroImages(manifest, products);

  return { products, kitHeroImages, fallbackCopySkus };
}

/**
 * Allocate a globally-unique, URL-safe slug (Requirement 10.3).
 *
 * The preferred slug is `slugify(name)`; if that is empty (e.g. the cleaned
 * name had no URL-safe characters) the manifest's already-slugified
 * `productSlug` is used, and `"product"` as a final safeguard. Collisions across
 * products are resolved by appending a numeric suffix (`-2`, `-3`, …). The
 * returned slug matches `^[a-z0-9-]+$` and is unique within `used`.
 */
function allocateUniqueSlug(
  name: string,
  fallbackSlug: string,
  used: Set<string>,
): string {
  const base = slugify(name) || fallbackSlug || "product";

  if (!used.has(base)) {
    used.add(base);
    return base;
  }

  let suffix = 2;
  let candidate = `${base}-${suffix}`;
  while (used.has(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  used.add(candidate);
  return candidate;
}

/* -------------------------------------------------------------------------- */
/* Storage-path integrity check (Task 16.1 — Requirements 24.3, 24.5)         */
/* -------------------------------------------------------------------------- */

/**
 * Matches the pre-rebuild SKU-folder storage layout (Requirement 24.5), e.g.
 * `product-images/NV-A14/NV-A14_01.webp`. The rebuilt tree only contains
 * lowercase slugified path segments, so an uppercase `NV-<LETTER><digits>/`
 * segment can never occur legitimately — its presence means a stale, pre-rebuild
 * URL leaked into the catalogue and generation must fail.
 *
 * Exported so the absent-storage-path property test (task 16.2, Property 23) can
 * assert the stale-layout guard directly.
 */
export const STALE_SKU_FOLDER_RE = /(?:^|\/)NV-[A-Z]\d+\//;

/**
 * Collect every relative storage path recorded in the manifest (Requirement 24.3).
 *
 * This is the authoritative set of object keys that exist in the rebuilt
 * `product-images/` tree: every product image path plus every `ALL KITS`
 * kit-hero path. A catalogue image URL is valid only if the relative path after
 * {@link STORAGE_BASE} is a member of this set.
 *
 * @param manifest  The parsed {@link ImageManifest}.
 * @returns         The set of valid relative storage paths (object keys).
 */
export function collectManifestStoragePaths(manifest: ImageManifest): Set<string> {
  const paths = new Set<string>();
  for (const product of manifest.products) {
    for (const relPath of product.images) {
      paths.add(relPath);
    }
  }
  for (const relPath of manifest.kitHeroImages) {
    paths.add(relPath);
  }
  return paths;
}

/**
 * Extract the relative storage path (object key) from a fully-qualified image
 * URL, i.e. the portion after `${STORAGE_BASE}/`. Returns `undefined` when the
 * URL is not on the storage base — every generated URL is built via {@link img}
 * so this only happens for a malformed/stale URL, which the integrity check
 * treats as a violation.
 *
 * @param url  A candidate image URL.
 * @returns    The relative storage path, or `undefined` when `url` is not on the
 *             storage base.
 */
export function relativeStoragePath(url: string): string | undefined {
  const prefix = `${STORAGE_BASE}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : undefined;
}

/**
 * Fail catalogue generation if any product or image-map URL references a storage
 * path that is absent from the rebuilt `product-images/` tree, or that uses the
 * pre-rebuild SKU-folder layout (Requirements 24.3, 24.5 — Property 23).
 *
 * For every `imageUrl` and `galleryImages` entry across all products, plus every
 * `kitHeroImages` URL (the `PRODUCT_IMAGES` map is derived from exactly these
 * product image fields, so validating the products validates the image map too),
 * this checks that:
 *   1. the URL does NOT match the stale `NV-<LETTER><digits>/` layout (Req 24.5);
 *   2. the URL is on the shared {@link STORAGE_BASE} (built via {@link img});
 *   3. the relative path after the base exists in the manifest set of rebuilt
 *      object keys (Req 24.3).
 *
 * Throws a descriptive generation error on the first violation. Exposed so the
 * absent-storage-path property test (task 16.2, Property 23) can import and
 * exercise it without any filesystem side effects.
 *
 * @param products       The built catalogue products.
 * @param kitHeroImages  The built kit hero image URLs.
 * @param manifest       The parsed {@link ImageManifest} (authoritative tree).
 */
export function assertNoAbsentStoragePaths(
  products: readonly Product[],
  kitHeroImages: readonly string[],
  manifest: ImageManifest,
): void {
  const validPaths = collectManifestStoragePaths(manifest);

  const check = (url: string, context: string): void => {
    // Req 24.5 — the pre-rebuild SKU-folder layout must never appear.
    if (STALE_SKU_FOLDER_RE.test(url)) {
      throw new Error(
        `Catalogue integrity check failed: ${context} uses the pre-rebuild ` +
          `SKU-folder storage layout ("${url}"). No image URL may reference the ` +
          `old NV-<LETTER><digits>/ layout (Requirement 24.5).`,
      );
    }

    // Every generated URL is built via img() and therefore begins with
    // `${STORAGE_BASE}/`; anything else is a malformed/stale URL.
    const relPath = relativeStoragePath(url);
    if (relPath === undefined) {
      throw new Error(
        `Catalogue integrity check failed: ${context} ("${url}") is not on the ` +
          `storage base ${STORAGE_BASE} (Requirement 24.3). Every image URL must ` +
          `be built from the shared storage base via the img() helper.`,
      );
    }

    // Req 24.3 — the relative path must exist in the rebuilt tree (manifest).
    if (!validPaths.has(relPath)) {
      throw new Error(
        `Catalogue integrity check failed: ${context} references the storage path ` +
          `"${relPath}", which is absent from the rebuilt product-images/ tree ` +
          `(Requirement 24.3). Re-run the restructure/upload steps or fix the ` +
          `catalogue so every image URL points at an existing object key.`,
      );
    }
  };

  for (const product of products) {
    if (product.imageUrl !== undefined) {
      check(product.imageUrl, `product ${product.sku} imageUrl`);
    }
    const gallery = product.galleryImages ?? [];
    gallery.forEach((url, index) => {
      check(url, `product ${product.sku} galleryImages[${index}]`);
    });
  }

  kitHeroImages.forEach((url, index) => {
    check(url, `kitHeroImages[${index}]`);
  });
}

/* -------------------------------------------------------------------------- */
/* Data-file emission — src/data/products.ts (Task 12.1)                      */
/* -------------------------------------------------------------------------- */

/**
 * Path of the emitted product catalogue, relative to the project root. Only
 * written by {@link main} on direct execution (`npm run generate-catalog`), so
 * importing this module (tests, the app build) never touches the committed file.
 */
export const PRODUCTS_FILE_PATH = join("src", "data", "products.ts");

/**
 * Field emission order for a serialized {@link Product} entry. Mirrors the
 * declaration order of the `Product` interface so the emitted file reads the
 * same way as a hand-written one. Only fields present on a given product are
 * emitted (optional/absent fields are skipped), keeping entries compact.
 */
const PRODUCT_FIELD_ORDER: readonly (keyof Product)[] = [
  "id",
  "sku",
  "name",
  "slug",
  "bucket",
  "tagline",
  "description",
  "whoIsItFor",
  "insight",
  "wowScore",
  "leadTimeDays",
  "rushLeadTimeDays",
  "moq",
  "materials",
  "personalizationTypes",
  "occasions",
  "archetypes",
  "tags",
  "recommendedPackaging",
  "imageUrl",
  "galleryImages",
  "isFeatured",
  "isBestseller",
  "isNew",
  "category",
  "personalisation",
  "milestone",
  "basePrice",
];

/**
 * The exact source line for the emitted `img` helper. Written as a plain string
 * (not a template literal) so the backticks and `${…}` in the arrow body are
 * emitted verbatim rather than interpolated at generation time. The emitted
 * definition is identical to {@link img}/`STORAGE_BASE` in `scripts/storage-url.ts`
 * so the data file and the generator can never drift (design §"URL construction").
 */
const IMG_HELPER_SRC =
  'export const img = (path: string): string => `${STORAGE_BASE}/${path.replace(/^\\/+/, "")}`;';

/**
 * Serialize an image URL. When the URL is a fully-qualified storage URL (begins
 * with `${STORAGE_BASE}/`, which every generated image URL does — Req 13.4,
 * 16.4), it is re-expressed as an `img("<relative-path>")` call so the emitted
 * file uses the exported helper and stays free of the repeated base prefix.
 * Any other string is emitted as a plain quoted literal.
 */
function serializeImageString(url: string): string {
  const prefix = `${STORAGE_BASE}/`;
  if (url.startsWith(prefix)) {
    return `img(${JSON.stringify(url.slice(prefix.length))})`;
  }
  return JSON.stringify(url);
}

/** Serialize a single product field value to TypeScript source. */
function serializeFieldValue(key: keyof Product, value: unknown): string {
  if (key === "imageUrl" && typeof value === "string") {
    return serializeImageString(value);
  }
  if (key === "galleryImages" && Array.isArray(value)) {
    return `[${value.map((entry) => serializeImageString(String(entry))).join(", ")}]`;
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => JSON.stringify(entry)).join(", ")}]`;
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  // Defensive fallback for any unexpected shape — still emits valid source.
  return JSON.stringify(value);
}

/**
 * Serialize a {@link Product} to an indented object-literal block. Fields are
 * emitted in {@link PRODUCT_FIELD_ORDER}; absent (`undefined`) fields are
 * skipped. Image fields use {@link serializeImageString} so they round-trip
 * through the exported `img` helper.
 */
function serializeProduct(product: Product, indent: string): string {
  const inner = `${indent}  `;
  const lines: string[] = [`${indent}{`];
  for (const key of PRODUCT_FIELD_ORDER) {
    const value: Product[keyof Product] = product[key];
    if (value === undefined) continue;
    lines.push(`${inner}${key}: ${serializeFieldValue(key, value)},`);
  }
  lines.push(`${indent}}`);
  return lines.join("\n");
}

/**
 * Render the full `src/data/products.ts` source text (Task 12.1).
 *
 * The emitted file (Req 9.1, 9.2, 9.5, 15.1, design §"Output shape"):
 *   - imports the existing `Product` type from `@/lib/types/product`;
 *   - re-exports `STORAGE_BASE` and the `img` helper (identical to
 *     `scripts/storage-url.ts` so the two never drift);
 *   - exports `PRODUCTS: readonly Product[]` with one entry per Product_Folder,
 *     already ordered collection-major (A→K), source-order-minor by
 *     {@link buildCatalog};
 *   - exports `kitHeroImages: string[]` (ALL KITS + EXPERIENCE KITS heroes).
 *
 * This is a pure function (no filesystem side effects) so the data-file
 * property/unit tests (tasks 12.4/12.5) can import and assert against its output.
 *
 * @param products        Ordered catalogue products (from {@link buildCatalog}).
 * @param kitHeroImages   Kit hero image URLs (from {@link buildCatalog}).
 * @returns               The complete TypeScript source for `src/data/products.ts`.
 */
export function renderProductsFile(
  products: readonly Product[],
  kitHeroImages: readonly string[],
): string {
  const out: string[] = [];

  out.push("/**");
  out.push(" * PRODUCTS - Public static catalogue data layer (NO-PRICE).");
  out.push(" *");
  out.push(" * AUTO-GENERATED by scripts/generate-catalog.ts from scripts/image-manifest.json.");
  out.push(" * Do NOT edit by hand - re-run `npm run generate-catalog` to regenerate.");
  out.push(" *");
  out.push(" * This is the PUBLIC data layer and intentionally contains NO pricing of any");
  out.push(" * kind. Entries are ordered by collection letter (A→K), preserving source");
  out.push(" * folder order within each collection (one entry per Product_Folder).");
  out.push(" */");
  out.push("");
  out.push('import type { Product } from "@/lib/types/product";');
  out.push("");
  out.push("export const STORAGE_BASE =");
  out.push(`  ${JSON.stringify(STORAGE_BASE)};`);
  out.push("");
  out.push(IMG_HELPER_SRC);
  out.push("");
  out.push("export const PRODUCTS: readonly Product[] = [");
  for (const product of products) {
    out.push(`${serializeProduct(product, "  ")},`);
  }
  out.push("];");
  out.push("");
  out.push("export const kitHeroImages: string[] = [");
  for (const url of kitHeroImages) {
    out.push(`  ${serializeImageString(url)},`);
  }
  out.push("];");
  out.push("");

  return out.join("\n");
}

/**
 * Write the rendered `src/data/products.ts` to disk (Task 12.1). Called only by
 * {@link main} on direct execution, so the committed data file is never touched
 * by an import, the app build, or the test suite.
 *
 * @param result   The catalogue build result (products + kit hero images).
 * @param rootDir  Project root (defaults to the current working directory).
 * @returns        The absolute path written.
 */
export function emitProductsFile(
  result: CatalogBuildResult,
  rootDir: string = process.cwd(),
): string {
  const absPath = join(rootDir, PRODUCTS_FILE_PATH);
  const source = renderProductsFile(result.products, result.kitHeroImages);
  writeFileSync(absPath, source, "utf8");
  return absPath;
}

/* -------------------------------------------------------------------------- */
/* Data-file emission — src/data/product-images.ts (Task 12.2)                */
/* -------------------------------------------------------------------------- */

/**
 * Path of the emitted product image map, relative to the project root. Only
 * written by {@link main} on direct execution (`npm run generate-catalog`), so
 * importing this module (tests, the app build) never touches the committed file.
 */
export const PRODUCT_IMAGES_FILE_PATH = join("src", "data", "product-images.ts");

/**
 * Serialize a single {@link Product}'s image set to an indented
 * `"<SKU>": { imageUrl, galleryImages }` block for the emitted
 * `PRODUCT_IMAGES` record.
 *
 * The block matches the committed file's `ProductImageSet` shape exactly:
 * `imageUrl: string` and `galleryImages: string[]`. Both fields are re-expressed
 * through the exported `img(...)` helper via {@link serializeImageString} (every
 * catalogue image URL begins with `${STORAGE_BASE}/` — Req 16.4), so the emitted
 * data never repeats the storage base and can never drift from it.
 *
 * The product's `imageUrl` / `galleryImages` are the values already derived by
 * {@link deriveImageUrl} / {@link deriveGalleryImages} during {@link buildCatalog}
 * (Req 13.2, 13.3), so the map is guaranteed consistent with the catalogue.
 *
 * @throws if `imageUrl` is undefined — {@link buildCatalog} enforces a non-empty
 *         `imageUrl` for every product (Req 9.3), so this only fires on misuse
 *         and preserves the "one entry per SKU" guarantee (Req 16.2).
 */
function serializeProductImageSet(product: Product, indent: string): string {
  const inner = `${indent}  `;
  const { sku, imageUrl } = product;
  if (imageUrl === undefined) {
    throw new Error(
      `Cannot emit product-images entry for ${sku}: imageUrl is undefined. ` +
        `Every product SKU must have an image set (Requirement 16.2); ` +
        `buildCatalog enforces a non-empty imageUrl (Requirement 9.3).`,
    );
  }
  const gallery = product.galleryImages ?? [];

  const lines: string[] = [`${indent}${JSON.stringify(sku)}: {`];
  lines.push(`${inner}imageUrl: ${serializeImageString(imageUrl)},`);
  if (gallery.length === 0) {
    lines.push(`${inner}galleryImages: [],`);
  } else {
    lines.push(`${inner}galleryImages: [`);
    for (const url of gallery) {
      lines.push(`${inner}  ${serializeImageString(url)},`);
    }
    lines.push(`${inner}],`);
  }
  lines.push(`${indent}}`);
  return lines.join("\n");
}

/**
 * Render the full `src/data/product-images.ts` source text (Task 12.2).
 *
 * The emitted file (Req 16.1–16.4, design §"Output shape — src/data/product-images.ts"):
 *   - imports the `img` helper from `./products` so every URL is built from the
 *     single shared `STORAGE_BASE` (Req 16.4) and can never drift;
 *   - re-declares the existing `ProductImageSet` interface unchanged so
 *     `src/lib/catalog.ts` keeps merging by SKU (Req 16.1);
 *   - exports `PRODUCT_IMAGES: Record<string, ProductImageSet>` with exactly one
 *     key per product SKU and no extra keys (Req 16.2, 16.3) — the keys are the
 *     catalogue SKUs in catalogue order (collection-major A→K).
 *
 * This is a pure function (no filesystem side effects) so the image-map property
 * test (task 12.4, Property 18) can import and assert against its output.
 *
 * @param products  Ordered catalogue products (from {@link buildCatalog}).
 * @returns         The complete TypeScript source for `src/data/product-images.ts`.
 */
export function renderProductImagesFile(products: readonly Product[]): string {
  const out: string[] = [];

  out.push("/**");
  out.push(" * PRODUCT_IMAGES - Public product image URL map (NO-PRICE).");
  out.push(" *");
  out.push(" * AUTO-GENERATED by scripts/generate-catalog.ts from scripts/image-manifest.json.");
  out.push(" * Do NOT edit by hand - re-run `npm run generate-catalog` to regenerate.");
  out.push(" *");
  out.push(" * Keyed by product SKU: exactly one key per SKU in PRODUCTS and no extra");
  out.push(" * keys. Merged into the catalogue by SKU via src/lib/catalog.ts. Every URL");
  out.push(" * is built from the shared storage base through the `img` helper.");
  out.push(" */");
  out.push("");
  out.push('import { img } from "./products";');
  out.push("");
  out.push("export interface ProductImageSet {");
  out.push("  imageUrl: string;");
  out.push("  galleryImages: string[];");
  out.push("}");
  out.push("");
  out.push("export const PRODUCT_IMAGES: Record<string, ProductImageSet> = {");
  for (const product of products) {
    out.push(`${serializeProductImageSet(product, "  ")},`);
  }
  out.push("};");
  out.push("");

  return out.join("\n");
}

/**
 * Write the rendered `src/data/product-images.ts` to disk (Task 12.2). Called
 * only by {@link main} on direct execution, so the committed data file is never
 * touched by an import, the app build, or the test suite.
 *
 * @param result   The catalogue build result (supplies the ordered products).
 * @param rootDir  Project root (defaults to the current working directory).
 * @returns        The absolute path written.
 */
export function emitProductImagesFile(
  result: CatalogBuildResult,
  rootDir: string = process.cwd(),
): string {
  const absPath = join(rootDir, PRODUCT_IMAGES_FILE_PATH);
  const source = renderProductImagesFile(result.products);
  writeFileSync(absPath, source, "utf8");
  return absPath;
}

/* -------------------------------------------------------------------------- */
/* Manifest reading + entrypoint                                              */
/* -------------------------------------------------------------------------- */

/**
 * Read and parse `scripts/image-manifest.json` from the given project root.
 *
 * This is only called by {@link main} (direct execution). Importing this module
 * never triggers a read, so the exported helpers can be used in tests without
 * the manifest file being present.
 *
 * @param rootDir  Project root (defaults to the current working directory).
 */
export function readManifest(rootDir: string = process.cwd()): ImageManifest {
  const manifestAbsPath = join(rootDir, MANIFEST_PATH);
  const raw = readFileSync(manifestAbsPath, "utf8");
  return JSON.parse(raw) as ImageManifest;
}

/**
 * Orchestrate catalogue generation for direct execution.
 *
 * Task 10.1 performs ingestion + identity/ordering derivation and reports the
 * result; data-file emission is task 12. Reads the manifest, builds the
 * catalogue, and logs a summary (including any SKUs using fallback copy).
 *
 * @param rootDir  Project root (defaults to the current working directory).
 */
export function main(rootDir: string = process.cwd()): CatalogBuildResult {
  const manifest = readManifest(rootDir);
  const result = buildCatalog(manifest);

  console.log(
    `[generate-catalog] products: ${result.products.length} ` +
      `(from ${manifest.products.length} manifest entries); ` +
      `kit hero images: ${result.kitHeroImages.length}; ` +
      `fallback copy: ${result.fallbackCopySkus.length}`,
  );
  if (result.fallbackCopySkus.length > 0) {
    console.log(
      `[generate-catalog] SKUs using fallback copy (follow-up authoring): ` +
        result.fallbackCopySkus.join(", "),
    );
  }

  // Storage-path integrity check (Task 16.1 — Req 24.3, 24.5). Runs BEFORE any
  // file is emitted so a stale or absent image path fails generation loudly and
  // never reaches the committed data files.
  assertNoAbsentStoragePaths(result.products, result.kitHeroImages, manifest);
  console.log(
    `[generate-catalog] storage-path integrity check passed ` +
      `(${collectManifestStoragePaths(manifest).size} object keys in manifest)`,
  );

  // Emit src/data/products.ts (Task 12.1). This write happens only here, on
  // direct execution — never on import, build, or test — so the committed data
  // file is safe until the maintainer runs `npm run generate-catalog`.
  const productsPath = emitProductsFile(result, rootDir);
  console.log(`[generate-catalog] wrote ${productsPath}`);

  // Emit src/data/product-images.ts (Task 12.2). Same direct-execution-only
  // guarantee as above — one SKU-keyed entry per product, all URLs on the
  // storage base via the shared `img` helper (Req 16.1–16.4).
  const productImagesPath = emitProductImagesFile(result, rootDir);
  console.log(`[generate-catalog] wrote ${productImagesPath}`);

  return result;
}

/**
 * Run {@link main} only when this module is executed directly (e.g.
 * `tsx scripts/generate-catalog.ts`), not when imported by tests. Guarded so
 * importing any exported helper never requires `image-manifest.json` to exist.
 */
function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(entry);
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  main();
}
