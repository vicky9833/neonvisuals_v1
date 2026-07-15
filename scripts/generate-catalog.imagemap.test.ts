/**
 * Property test for the SKU-keyed image map of the catalogue generator
 * (`scripts/generate-catalog.ts`).
 *
 * Feature: image-catalog-rebuild — Property 18 (image-map keys equal the
 * catalogue SKUs).
 *
 * Covered spec task:
 *   - 12.4 — Property 18: "Image map keys equal the catalogue SKUs."
 *            The emitted `PRODUCT_IMAGES` map has exactly one key per product
 *            SKU in the catalogue — no extra keys and no missing keys.
 *            **Validates: Requirements 16.1, 16.2, 16.3**
 *
 * The property drives the pure generator pipeline end-to-end over synthetic
 * in-memory {@link ImageManifest} fixtures: `buildCatalog` derives the ordered
 * catalogue, `renderProductImagesFile` serialises the SKU-keyed
 * `PRODUCT_IMAGES` source text, and the test parses the emitted top-level keys
 * and asserts they equal exactly the set of catalogue SKUs. It never depends on
 * a real `scripts/image-manifest.json`. The property test runs >= 100 iterations.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { buildCatalog, renderProductImagesFile } from "./generate-catalog";
import type { ImageManifest, ManifestProduct } from "./restructure-images";
import type { BucketCode } from "../src/lib/types/product";

const NUM_RUNS = 150;

/**
 * Collection letters whose first products fall back to generated
 * (collection-contextual) copy, keeping fixtures independent of the single
 * authored `NV-A-001` entry.
 */
const FALLBACK_LETTERS: readonly BucketCode[] = ["C", "D", "E", "G", "I", "J", "K"];

/* -------------------------------------------------------------------------- */
/* Synthetic manifest fixtures (no filesystem, no real manifest.json)         */
/* -------------------------------------------------------------------------- */

/** A modelled variant set: its slug and the ordered relative image paths in it. */
interface VariantSetModel {
  slug: string;
  images: string[];
}

/** Wrap a bare list of manifest products in a full, well-formed manifest. */
function makeManifest(products: ManifestProduct[]): ImageManifest {
  const folderCounts: Record<string, number> = {};
  for (const product of products) {
    for (const image of product.images) {
      const folder = image.slice(0, image.lastIndexOf("/"));
      folderCounts[folder] = (folderCounts[folder] ?? 0) + 1;
    }
  }
  return {
    generatedAt: "2024-01-01T00:00:00.000Z",
    source: "neonvisualsfinal",
    folderCounts,
    products,
    kitHeroImages: [],
    summary: {
      foldersProcessed: products.length,
      filesCopied: products.reduce((total, p) => total + p.images.length, 0),
      filesSkippedMp4: 0,
      filesSkippedOther: 0,
      errors: 0,
      unmatchedTopLevelFolders: [],
    },
  };
}

/**
 * Build a manifest product from a set of modelled variant sets. The manifest's
 * `images` array is variant-set-major (all images of the first variant set,
 * then the second, …) — exactly as the restructure step records it — so at
 * least one image guarantees a derivable, non-empty `imageUrl`.
 */
function makeManifestProduct(
  letter: BucketCode,
  storageSlug: string,
  productSlug: string,
  sourceName: string,
  variantSets: VariantSetModel[],
): ManifestProduct {
  return {
    collectionLetter: letter,
    storageSlug,
    productSlug,
    sourcePath: `${storageSlug}/${sourceName}`,
    variantSets: variantSets.map((set) => set.slug),
    images: variantSets.flatMap((set) => set.images),
  };
}

/**
 * Parse the top-level SKU keys from a rendered `src/data/product-images.ts`
 * source. Each `PRODUCT_IMAGES` entry is emitted as `  "NV-<L>-<NNN>": {` on
 * its own line (see `serializeProductImageSet`), so a line-anchored match over
 * the two-space top-level indent recovers exactly the map's keys.
 */
function parseImageMapKeys(source: string): string[] {
  const keys: string[] = [];
  for (const line of source.split("\n")) {
    const match = /^ {2}"(NV-[A-K]-\d{3})": \{$/.exec(line);
    if (match) {
      keys.push(match[1]);
    }
  }
  return keys;
}

/* -------------------------------------------------------------------------- */
/* fast-check generators                                                       */
/* -------------------------------------------------------------------------- */

/** A URL-safe path token (lowercase letters/digits), 3–10 chars, always non-empty. */
const tokenArb = fc
  .stringMatching(/^[a-z][a-z0-9]{2,9}$/)
  .filter((s) => s.length >= 3 && s.length <= 10);

const imageExtArb = fc.constantFrom(".webp", ".jpg", ".jpeg", ".avif", ".png");

/**
 * Generate a single product model: a collection letter, a storage slug, a
 * product slug/name, and 1..3 variant sets each holding 1..3 uniquely-named
 * images. At least one image is guaranteed so `imageUrl` is always derivable.
 */
const productModelArb = fc
  .record({
    letter: fc.constantFrom<BucketCode>(...FALLBACK_LETTERS),
    storageSlug: tokenArb,
    productSlug: tokenArb,
    // `flat` products have no variant subfolder; otherwise 1..3 variant sets.
    variantCount: fc.integer({ min: 0, max: 3 }),
    imagesPerSet: fc.array(fc.integer({ min: 1, max: 3 }), { minLength: 1, maxLength: 3 }),
    ext: imageExtArb,
  })
  .map(({ letter, storageSlug, productSlug, variantCount, imagesPerSet, ext }) => {
    const base = `${storageSlug}/${productSlug}`;
    let variantSets: VariantSetModel[];
    if (variantCount === 0) {
      const count = imagesPerSet[0];
      const images = Array.from({ length: count }, (_, i) => `${base}/image-${i + 1}${ext}`);
      variantSets = [{ slug: "", images }];
    } else {
      variantSets = Array.from({ length: variantCount }, (_, v) => {
        const count = imagesPerSet[v % imagesPerSet.length];
        const slug = `set-${v + 1}`;
        const images = Array.from(
          { length: count },
          (_, i) => `${base}/${slug}/image-${i + 1}${ext}`,
        );
        return { slug, images };
      });
    }
    const sourceName = productSlug.replace(/-/g, " ");
    return { letter, storageSlug, productSlug, sourceName, variantSets };
  });

/* -------------------------------------------------------------------------- */
/* Property 18 — Image map keys equal the catalogue SKUs                       */
/* -------------------------------------------------------------------------- */

describe("Feature: image-catalog-rebuild, Property 18 — image map keys equal the catalogue SKUs", () => {
  it("PRODUCT_IMAGES has exactly one key per catalogue SKU — no extra keys, no missing keys", () => {
    fc.assert(
      fc.property(
        fc.array(productModelArb, { minLength: 1, maxLength: 12 }),
        (models) => {
          const manifestProducts = models.map((model) =>
            makeManifestProduct(
              model.letter,
              model.storageSlug,
              model.productSlug,
              model.sourceName,
              model.variantSets,
            ),
          );

          const { products } = buildCatalog(makeManifest(manifestProducts));
          const skus = products.map((product) => product.sku);

          const source = renderProductImagesFile(products);
          const keys = parseImageMapKeys(source);

          // One emitted key per product (no duplicates, exact cardinality) — Req 16.1, 16.2.
          expect(keys).toHaveLength(products.length);
          expect(new Set(keys).size).toBe(keys.length);

          // Every catalogue SKU is present as a key — no missing keys (Req 16.2).
          const keySet = new Set(keys);
          for (const sku of skus) {
            expect(keySet.has(sku)).toBe(true);
          }

          // No key is absent from the catalogue — no extra keys (Req 16.3).
          const skuSet = new Set(skus);
          for (const key of keys) {
            expect(skuSet.has(key)).toBe(true);
          }

          // The key set equals the SKU set exactly, in catalogue order.
          expect(keys).toEqual(skus);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
