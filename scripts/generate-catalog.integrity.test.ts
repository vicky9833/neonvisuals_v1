/**
 * Property test for the storage-path integrity check of the catalogue generator
 * (`scripts/generate-catalog.ts`).
 *
 * Feature: image-catalog-rebuild — Property 23 (no image URL references an
 * absent storage path).
 *
 * Covered spec task:
 *   - 16.2 — Property 23: "No image URL references an absent storage path."
 *            For a catalogue built from a manifest, every product `imageUrl` /
 *            `galleryImages` URL and every `kitHeroImages` URL resolves to a
 *            relative storage path that exists in the manifest's rebuilt tree,
 *            and none uses the pre-rebuild `NV-<LETTER><digits>/` layout.
 *            **Validates: Requirements 24.3**
 *
 * The property test builds synthetic in-memory {@link ImageManifest} fixtures —
 * it never depends on a real `scripts/image-manifest.json`. It exercises the
 * pure integrity check directly through `assertNoAbsentStoragePaths` (imported
 * from the generator) over a catalogue produced by `buildCatalog`, plus its two
 * failure modes:
 *   - a product URL whose relative path is absent from the manifest, and
 *   - a URL that uses the stale `NV-<LETTER><digits>/` SKU-folder layout.
 * The property runs >= 100 iterations.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import {
  assertNoAbsentStoragePaths,
  buildCatalog,
  collectManifestStoragePaths,
  relativeStoragePath,
  STALE_SKU_FOLDER_RE,
} from "./generate-catalog";
import type { ImageManifest, ManifestProduct } from "./restructure-images";
import { img } from "./storage-url";
import type { BucketCode } from "../src/lib/types/product";

const NUM_RUNS = 150;

/** Collection letters whose first product uses deterministic fallback copy. */
const FALLBACK_LETTERS: readonly BucketCode[] = ["C", "D", "E", "G", "I", "J", "K"];

/* -------------------------------------------------------------------------- */
/* Synthetic manifest fixtures (no filesystem, no real manifest.json)         */
/* -------------------------------------------------------------------------- */

/** A modelled variant set: its slug and the ordered relative image paths in it. */
interface VariantSetModel {
  slug: string;
  images: string[];
}

/** A generated product model (the object `productModelArb` yields). */
interface ProductModel {
  letter: BucketCode;
  storageSlug: string;
  productSlug: string;
  sourceName: string;
  variantSets: VariantSetModel[];
}

/** Wrap a bare list of manifest products in a full, well-formed manifest. */
function makeManifest(
  products: ManifestProduct[],
  kitHeroImages: string[] = [],
): ImageManifest {
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
    kitHeroImages,
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
 * then the second, …) — exactly as the restructure step records it.
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
const productModelArb: fc.Arbitrary<ProductModel> = fc
  .record({
    letter: fc.constantFrom<BucketCode>(...FALLBACK_LETTERS),
    storageSlug: tokenArb,
    productSlug: tokenArb,
    variantCount: fc.integer({ min: 0, max: 3 }),
    imagesPerSet: fc.array(fc.integer({ min: 1, max: 3 }), { minLength: 1, maxLength: 3 }),
    ext: imageExtArb,
  })
  .map(({ letter, storageSlug, productSlug, variantCount, imagesPerSet, ext }): ProductModel => {
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

/** A non-empty catalogue's worth of product models, pre-sorted collection-major. */
const catalogModelsArb = fc
  .array(productModelArb, { minLength: 1, maxLength: 12 })
  .map((models) =>
    [...models].sort((a, b) => (a.letter < b.letter ? -1 : a.letter > b.letter ? 1 : 0)),
  );

/** Build a well-formed manifest from an array of product models. */
function manifestFromModels(models: ProductModel[]): ImageManifest {
  const manifestProducts = models.map((model) =>
    makeManifestProduct(
      model.letter,
      model.storageSlug,
      model.productSlug,
      model.sourceName,
      model.variantSets,
    ),
  );
  return makeManifest(manifestProducts);
}

/* -------------------------------------------------------------------------- */
/* Property 23 — No image URL references an absent storage path               */
/* -------------------------------------------------------------------------- */

describe("Feature: image-catalog-rebuild, Property 23 — no image URL references an absent storage path", () => {
  it("assertNoAbsentStoragePaths never throws for a catalogue built from its own manifest (positive)", () => {
    fc.assert(
      fc.property(catalogModelsArb, (models) => {
        const manifest = manifestFromModels(models);
        const { products, kitHeroImages } = buildCatalog(manifest);

        // Every product/image-map/kit-hero URL resolves to a manifest path and
        // none uses the stale layout — the check must accept the catalogue.
        expect(() =>
          assertNoAbsentStoragePaths(products, kitHeroImages, manifest),
        ).not.toThrow();

        // Sanity: every derived relative path is a member of the manifest set.
        const validPaths = collectManifestStoragePaths(manifest);
        for (const product of products) {
          const urls = [product.imageUrl, ...(product.galleryImages ?? [])].filter(
            (url): url is string => url !== undefined,
          );
          for (const url of urls) {
            const rel = relativeStoragePath(url);
            expect(rel).toBeDefined();
            expect(validPaths.has(rel as string)).toBe(true);
          }
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("throws when a product URL references a relative path absent from the manifest (negative)", () => {
    fc.assert(
      fc.property(
        catalogModelsArb,
        tokenArb,
        fc.boolean(),
        (models, orphanToken, injectIntoGallery) => {
          const manifest = manifestFromModels(models);
          const { products, kitHeroImages } = buildCatalog(manifest);

          // A well-formed storage URL whose relative path is guaranteed NOT in
          // the manifest (an `absent/` top-level segment never appears in a
          // fixture path built from the product slug tokens).
          const absentRelPath = `absent/${orphanToken}/ghost-image.webp`;
          const absentUrl = img(absentRelPath);
          expect(collectManifestStoragePaths(manifest).has(absentRelPath)).toBe(false);

          const target = products[0];
          if (injectIntoGallery) {
            target.galleryImages = [...(target.galleryImages ?? []), absentUrl];
          } else {
            target.imageUrl = absentUrl;
          }

          expect(() =>
            assertNoAbsentStoragePaths(products, kitHeroImages, manifest),
          ).toThrow(/absent from the rebuilt product-images\/ tree/i);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("throws when a URL uses the stale NV-<LETTER><digits>/ SKU-folder layout (negative)", () => {
    fc.assert(
      fc.property(
        catalogModelsArb,
        fc.constantFrom<BucketCode>("A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"),
        fc.integer({ min: 1, max: 999 }),
        fc.boolean(),
        (models, letter, num, injectIntoGallery) => {
          const manifest = manifestFromModels(models);
          const { products, kitHeroImages } = buildCatalog(manifest);

          // A pre-rebuild SKU-folder URL, e.g. `.../NV-A14/NV-A14_01.webp`.
          const staleFolder = `NV-${letter}${num}`;
          const staleUrl = img(`${staleFolder}/${staleFolder}_01.webp`);
          // Sanity: the stale layout is what the guard is meant to catch.
          expect(STALE_SKU_FOLDER_RE.test(staleUrl)).toBe(true);

          const target = products[0];
          if (injectIntoGallery) {
            target.galleryImages = [...(target.galleryImages ?? []), staleUrl];
          } else {
            target.imageUrl = staleUrl;
          }

          expect(() =>
            assertNoAbsentStoragePaths(products, kitHeroImages, manifest),
          ).toThrow(/pre-rebuild/i);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
