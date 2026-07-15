/**
 * Property + unit tests for the image / cross-collection logic of the catalogue
 * generator (`scripts/generate-catalog.ts`).
 *
 * Feature: image-catalog-rebuild — Property 17 (image-field derivation) and the
 * cross-collection duplicate distinctness unit test (Requirement 15.3).
 *
 * Covered spec tasks:
 *   - 11.7 — Property 17: "Image fields are derived from the product's images."
 *            For any generated product, `imageUrl` equals
 *            `img(firstImageOfFirstVariantSet)` and `galleryImages` equals the
 *            ordered list of `img(x)` over every image across all of the
 *            product's variant sets.  (Validates: Requirements 13.2, 13.3)
 *   - 11.8 — Cross-collection duplicate distinctness: a product duplicated by
 *            name across two collections yields one entry per collection, each
 *            with a distinct SKU and a distinct description.
 *            (Validates: Requirement 15.3)
 *
 * The property test drives the pure image-derivation helpers directly and,
 * end-to-end, through `buildCatalog` over synthetic in-memory
 * {@link ImageManifest} fixtures — it never depends on a real
 * `scripts/image-manifest.json`. The property test runs >= 100 iterations.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import {
  buildCatalog,
  deriveGalleryImages,
  deriveImageUrl,
  findCrossCollectionDuplicates,
  assertCrossCollectionDistinct,
} from "./generate-catalog";
import type { ImageManifest, ManifestProduct } from "./restructure-images";
import { img, STORAGE_BASE } from "./storage-url";
import type { BucketCode } from "../src/lib/types/product";

const NUM_RUNS = 150;

/** Collection letters that carry no authored copy at sequence 001, so their
 * first product falls back to generated (collection-contextual) copy. This lets
 * the cross-collection fixtures rely on the deterministic fallback distinctness
 * rather than on the single authored `NV-A-001` entry. */
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
 * then the second, …) — exactly as the restructure step records it — so
 * `images[0]` is the first image of the product's first variant set.
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
      // Flat-image product: single implicit set, images live directly under the product.
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
/* Property 17 — Image fields are derived from the product's images           */
/* -------------------------------------------------------------------------- */

describe("Feature: image-catalog-rebuild, Property 17 — image fields are derived from the product's images", () => {
  it("deriveImageUrl returns img(first image of the first variant set) and deriveGalleryImages returns ordered img(x) over all variant sets", () => {
    fc.assert(
      fc.property(productModelArb, (model) => {
        const firstVariantSet = model.variantSets[0];
        const firstImageOfFirstVariantSet = firstVariantSet.images[0];
        const allImages = model.variantSets.flatMap((set) => set.images);

        // imageUrl = img(first image of the first variant set) — Req 13.2.
        expect(deriveImageUrl(allImages)).toBe(img(firstImageOfFirstVariantSet));

        // galleryImages = ordered img(x) over every image across all sets — Req 13.3.
        expect(deriveGalleryImages(allImages)).toEqual(allImages.map((path) => img(path)));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("every generated product's imageUrl and galleryImages are derived from that product's manifest images", () => {
    fc.assert(
      fc.property(
        // Pre-sorted by collection letter so `buildCatalog`'s stable
        // collection-major re-sort preserves order, letting us zip result
        // products with their source manifest products by index.
        fc.array(productModelArb, { minLength: 1, maxLength: 12 }),
        (models) => {
          const sorted = [...models].sort((a, b) =>
            a.letter < b.letter ? -1 : a.letter > b.letter ? 1 : 0,
          );

          const manifestProducts = sorted.map((model) =>
            makeManifestProduct(
              model.letter,
              model.storageSlug,
              model.productSlug,
              model.sourceName,
              model.variantSets,
            ),
          );
          const manifest = makeManifest(manifestProducts);

          const { products } = buildCatalog(manifest);

          expect(products).toHaveLength(sorted.length);

          products.forEach((product, index) => {
            const sourceImages = manifestProducts[index].images;
            const firstImageOfFirstVariantSet = sorted[index].variantSets[0].images[0];

            // Sanity: the first source image is the first image of the first set.
            expect(sourceImages[0]).toBe(firstImageOfFirstVariantSet);

            // imageUrl = img(first image of the first variant set) — Req 13.2.
            expect(product.imageUrl).toBe(img(firstImageOfFirstVariantSet));

            // galleryImages = ordered img(x) over all variant sets — Req 13.3.
            expect(product.galleryImages).toEqual(sourceImages.map((path) => img(path)));

            // Every derived URL is anchored on the single storage base.
            expect(product.imageUrl?.startsWith(`${STORAGE_BASE}/`)).toBe(true);
            for (const url of product.galleryImages ?? []) {
              expect(url.startsWith(`${STORAGE_BASE}/`)).toBe(true);
            }
          });
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Cross-collection duplicate distinctness (Requirement 15.3) — task 11.8     */
/* -------------------------------------------------------------------------- */

describe("cross-collection duplicate distinctness (Requirement 15.3)", () => {
  /**
   * Fixture: the same physical product ("Bamboo Desk Organiser") duplicated
   * across two collections (D = Festive & Seasonal, E = Client Appreciation),
   * plus an unrelated single-collection product to prove non-duplicates are
   * left alone.
   */
  function buildDuplicateFixture(): ReturnType<typeof buildCatalog> {
    const products: ManifestProduct[] = [
      makeManifestProduct("D", "festive", "bamboo-desk-organiser", "BAMBOO DESK ORGANISER", [
        { slug: "", images: ["festive/bamboo-desk-organiser/image-1.webp"] },
      ]),
      makeManifestProduct("E", "client", "bamboo-desk-organiser", "BAMBOO DESK ORGANISER", [
        { slug: "", images: ["client/bamboo-desk-organiser/image-1.webp"] },
      ]),
      makeManifestProduct("E", "client", "leather-portfolio", "LEATHER PORTFOLIO", [
        { slug: "", images: ["client/leather-portfolio/image-1.webp"] },
      ]),
    ];
    return buildCatalog(makeManifest(products));
  }

  it("emits one entry per collection for a cross-collection duplicate", () => {
    const { products } = buildDuplicateFixture();

    const duplicates = products.filter((p) => p.name === "Bamboo Desk Organiser");
    expect(duplicates).toHaveLength(2);
    expect(duplicates.map((p) => p.bucket).sort()).toEqual(["D", "E"]);
  });

  it("gives each duplicated entry a distinct SKU", () => {
    const { products } = buildDuplicateFixture();

    const duplicates = products.filter((p) => p.name === "Bamboo Desk Organiser");
    const skus = duplicates.map((p) => p.sku);
    expect(new Set(skus).size).toBe(skus.length);
    // Per-collection sequencing: distinct letters yield distinct SKUs.
    expect(skus).toContain("NV-D-001");
    expect(skus).toContain("NV-E-001");
  });

  it("gives each duplicated entry a distinct description", () => {
    const { products } = buildDuplicateFixture();

    const duplicates = products.filter((p) => p.name === "Bamboo Desk Organiser");
    const descriptions = duplicates.map((p) => p.description);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    for (const description of descriptions) {
      expect(description.trim().length).toBeGreaterThan(0);
    }
  });

  it("findCrossCollectionDuplicates groups only the cross-collection product", () => {
    const { products } = buildDuplicateFixture();

    const groups = findCrossCollectionDuplicates(products);
    expect(groups.size).toBe(1);

    const [group] = [...groups.values()];
    expect(group).toHaveLength(2);
    expect(new Set(group.map((p) => p.bucket))).toEqual(new Set<BucketCode>(["D", "E"]));

    // The unrelated single-collection product is not grouped as a duplicate.
    expect([...groups.values()].flat().some((p) => p.name === "Leather Portfolio")).toBe(false);
  });

  it("assertCrossCollectionDistinct accepts the generated catalogue", () => {
    const { products } = buildDuplicateFixture();
    expect(() => assertCrossCollectionDistinct(products)).not.toThrow();
  });

  it("assertCrossCollectionDistinct rejects a duplicate group sharing a description", () => {
    const { products } = buildDuplicateFixture();

    // Force a collision to prove the guard actually detects repeated descriptions.
    const duplicates = products.filter((p) => p.name === "Bamboo Desk Organiser");
    duplicates[1].description = duplicates[0].description;

    expect(() => assertCrossCollectionDistinct(products)).toThrow(/distinct description/i);
  });
});
