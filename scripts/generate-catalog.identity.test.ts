/**
 * Property-based and unit tests for the identity / ordering / required-field
 * behaviour of `scripts/generate-catalog.ts`.
 *
 * Feature: image-catalog-rebuild
 *
 * Covers the optional test sub-tasks 10.2–10.7:
 *   - Property 7  (task 10.2) — Catalogue cardinality matches the manifest.
 *   - Property 8  (task 10.3) — Required product fields are always non-empty.
 *   - Property 9  (task 10.4) — SKU format and per-collection uniqueness.
 *   - Property 10 (task 10.5) — Slugs are globally unique and URL-safe.
 *   - Property 11 (task 10.6) — Catalogue ordering is collection-major,
 *                               source-order-minor.
 *   - Unit tests  (task 10.7) — Name cleaning artefact-stripping / title-casing
 *                               and the ≥150-entry generation guarantee.
 *
 * All property tests build synthetic in-memory {@link ImageManifest} fixtures
 * with fast-check generators (>= 100 iterations each) — they never read a real
 * `image-manifest.json`. Fixtures are constrained to the valid input space so
 * `buildCatalog` never rejects a well-formed manifest.
 */

import fc from "fast-check";
import { describe, expect, test } from "vitest";

import type { BucketCode } from "../src/lib/types/product";
import {
  buildCatalog,
  cleanName,
  deriveSku,
  orderManifestProducts,
} from "./generate-catalog";
import type { ImageManifest, ManifestProduct } from "./restructure-images";

/* -------------------------------------------------------------------------- */
/* Shared fast-check generators + fixture helpers                             */
/* -------------------------------------------------------------------------- */

/** The eleven valid collection letters. */
const LETTERS: readonly BucketCode[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K",
];

const ALPHA = "abcdefghijklmnopqrstuvwxyz".split("");
const IMAGE_EXTS = [".webp", ".jpg", ".jpeg", ".avif", ".png"] as const;

/** A short lowercase alpha word (never a "set N" artefact on its own). */
const alphaWordGen: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...ALPHA), { minLength: 2, maxLength: 6 })
  .map((chars) => chars.join(""));

/** A single collection letter `"A"`–`"K"`. */
const letterGen: fc.Arbitrary<BucketCode> = fc.constantFrom(...LETTERS);

/** A relative storage path such as `brass/brass-3.webp`. */
const relPathGen: fc.Arbitrary<string> = fc
  .tuple(alphaWordGen, fc.integer({ min: 0, max: 99 }), fc.constantFrom(...IMAGE_EXTS))
  .map(([word, n, ext]) => `${word}/${word}-${n}${ext}`);

/** A non-empty ordered list of relative image paths. */
const imagesGen: fc.Arbitrary<string[]> = fc.array(relPathGen, {
  minLength: 1,
  maxLength: 4,
});

/** The per-product generation spec (before unique-index injection). */
interface ProductSpec {
  letter: BucketCode;
  words: string[];
  images: string[];
}

const productSpecGen: fc.Arbitrary<ProductSpec> = fc.record({
  letter: letterGen,
  words: fc.array(alphaWordGen, { minLength: 1, maxLength: 3 }),
  images: imagesGen,
});

/**
 * Turn a spec + its array index into a {@link ManifestProduct}.
 *
 * The source folder base name is prefixed with a unique `p<index>` token so
 * that (a) every product has a distinct, non-empty cleaned name, and (b) the
 * original source position can be recovered from the generated `name` (used by
 * the ordering property). The `p<index>` token is alphanumeric and leading, so
 * `cleanName`'s trailing "set N" stripping can never remove it.
 */
function specToManifestProduct(spec: ProductSpec, index: number): ManifestProduct {
  const rawName = `p${index} ${spec.words.join(" ")}`.trim();
  return {
    collectionLetter: spec.letter,
    storageSlug: "coll",
    productSlug: `p${index}`,
    sourcePath: `neonvisualsfinal/coll/${rawName}`,
    variantSets: [],
    images: spec.images,
  };
}

/** Wrap a list of manifest products in a complete, valid {@link ImageManifest}. */
function makeManifest(products: ManifestProduct[]): ImageManifest {
  return {
    generatedAt: new Date(0).toISOString(),
    source: "neonvisualsfinal",
    folderCounts: {},
    products,
    kitHeroImages: [],
    summary: {
      foldersProcessed: products.length,
      filesCopied: 0,
      filesSkippedMp4: 0,
      filesSkippedOther: 0,
      errors: 0,
      unmatchedTopLevelFolders: [],
    },
  };
}

/**
 * A generator over full, valid manifests. Products are assigned unique indices
 * so their names are distinct and their source order is recoverable.
 */
const manifestGen: fc.Arbitrary<ImageManifest> = fc
  .array(productSpecGen, { minLength: 1, maxLength: 25 })
  .map((specs) => makeManifest(specs.map(specToManifestProduct)));

/** Recover the injected `p<index>` source-position tag from a string. */
function sourceTag(text: string): number {
  const match = text.match(/p(\d+)/i);
  expect(match, `expected a p<index> tag in "${text}"`).not.toBeNull();
  return Number((match as RegExpMatchArray)[1]);
}

/** Number of property-test iterations (>= 100 as required by the design). */
const NUM_RUNS = 200;

/* -------------------------------------------------------------------------- */
/* Property 7 — Catalogue cardinality matches the manifest (task 10.2)        */
/* -------------------------------------------------------------------------- */

describe("Feature: image-catalog-rebuild, Property 7 — catalogue cardinality", () => {
  // Validates: Requirements 9.1
  test("generated PRODUCTS has exactly one entry per detected Product_Folder", () => {
    fc.assert(
      fc.property(manifestGen, (manifest) => {
        const { products } = buildCatalog(manifest);
        expect(products).toHaveLength(manifest.products.length);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Property 8 — Required product fields are always non-empty (task 10.3)      */
/* -------------------------------------------------------------------------- */

describe("Feature: image-catalog-rebuild, Property 8 — required fields non-empty", () => {
  // Validates: Requirements 9.3
  test("id, sku, name, slug, bucket, description, imageUrl are present and non-empty", () => {
    fc.assert(
      fc.property(manifestGen, (manifest) => {
        const { products } = buildCatalog(manifest);
        for (const product of products) {
          for (const field of ["id", "sku", "name", "slug", "bucket", "description", "imageUrl"] as const) {
            const value = product[field];
            expect(typeof value).toBe("string");
            expect((value as string).trim().length).toBeGreaterThan(0);
          }
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Property 9 — SKU format and per-collection uniqueness (task 10.4)          */
/* -------------------------------------------------------------------------- */

describe("Feature: image-catalog-rebuild, Property 9 — SKU format and uniqueness", () => {
  // Validates: Requirements 10.1, 10.2
  test("every sku matches NV-<A-K>-<NNN>, id equals sku, and sequences are unique per collection", () => {
    const SKU_RE = /^NV-[A-K]-\d{3}$/;
    fc.assert(
      fc.property(manifestGen, (manifest) => {
        const { products } = buildCatalog(manifest);
        const seenByCollection = new Map<BucketCode, Set<string>>();

        for (const product of products) {
          // Format (10.1) and the letter agreeing with the bucket.
          expect(product.sku).toMatch(SKU_RE);
          expect(product.sku.slice(3, 4)).toBe(product.bucket);
          // id equals sku (10.2).
          expect(product.id).toBe(product.sku);

          // Per-collection uniqueness (10.1).
          let seen = seenByCollection.get(product.bucket);
          if (!seen) {
            seen = new Set<string>();
            seenByCollection.set(product.bucket, seen);
          }
          expect(seen.has(product.sku)).toBe(false);
          seen.add(product.sku);
        }

        // The first product of each collection is always the -001 sequence.
        for (const [letter, skus] of seenByCollection) {
          expect(skus.has(deriveSku(letter, 1))).toBe(true);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Property 10 — Slugs are globally unique and URL-safe (task 10.5)           */
/* -------------------------------------------------------------------------- */

describe("Feature: image-catalog-rebuild, Property 10 — slug uniqueness and safety", () => {
  // Validates: Requirements 10.3
  test("all slugs are globally distinct and match ^[a-z0-9-]+$", () => {
    const SLUG_RE = /^[a-z0-9-]+$/;
    fc.assert(
      fc.property(manifestGen, (manifest) => {
        const { products } = buildCatalog(manifest);
        const slugs = new Set<string>();
        for (const product of products) {
          expect(product.slug).toMatch(SLUG_RE);
          expect(slugs.has(product.slug)).toBe(false);
          slugs.add(product.slug);
        }
        expect(slugs.size).toBe(products.length);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Property 11 — Ordering: collection-major, source-order-minor (task 10.6)   */
/* -------------------------------------------------------------------------- */

describe("Feature: image-catalog-rebuild, Property 11 — catalogue ordering", () => {
  // Validates: Requirements 9.4
  test("collection letters are non-decreasing and source order is preserved within a collection", () => {
    fc.assert(
      fc.property(manifestGen, (manifest) => {
        const { products } = buildCatalog(manifest);

        // (a) Collection-major: consecutive letters never decrease (A -> K).
        for (let i = 1; i < products.length; i += 1) {
          expect(products[i - 1].bucket <= products[i].bucket).toBe(true);
        }

        // (b) Source-order-minor: within each collection the output source-tag
        // sequence equals the input manifest's source-tag sequence for that
        // letter (derived independently from the raw manifest, not the SUT sort).
        const inputByLetter = new Map<BucketCode, number[]>();
        for (const mp of manifest.products) {
          const list = inputByLetter.get(mp.collectionLetter) ?? [];
          list.push(sourceTag(mp.sourcePath));
          inputByLetter.set(mp.collectionLetter, list);
        }

        const outputByLetter = new Map<BucketCode, number[]>();
        for (const product of products) {
          const list = outputByLetter.get(product.bucket) ?? [];
          list.push(sourceTag(product.name));
          outputByLetter.set(product.bucket, list);
        }

        for (const [letter, inputTags] of inputByLetter) {
          expect(outputByLetter.get(letter)).toEqual(inputTags);
        }

        // Cross-check the output aligns 1:1 with the stable-sorted manifest.
        const expectedOrder = orderManifestProducts(manifest.products);
        expect(products.map((p) => p.bucket)).toEqual(
          expectedOrder.map((mp) => mp.collectionLetter),
        );
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Unit tests — name cleaning and minimum entry count (task 10.7)             */
/* -------------------------------------------------------------------------- */

describe("Feature: image-catalog-rebuild — name cleaning and minimum entry count", () => {
  // Validates: Requirements 10.4
  describe("cleanName strips source artefacts and applies title casing", () => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      ["BRASS PEN STAND SET 1", "Brass Pen Stand"],
      ["ARTISNAL TEA SET 2", "Artisnal Tea"],
      ["CRYSTAL AWARD SET 3", "Crystal Award"],
      ["SUCCULENT DESK PLANT SET 3", "Succulent Desk Plant"],
      ["CAP SET1", "Cap"],
      ["leather diary", "Leather Diary"],
      ["ECO_WOOD DIARY", "Eco Wood Diary"],
    ];

    for (const [raw, expected] of cases) {
      test(`"${raw}" -> "${expected}"`, () => {
        expect(cleanName(raw)).toBe(expected);
      });
    }

    test("never returns an empty name when the whole phrase looks like an artefact", () => {
      // "SET 5" would strip to empty; the fallback keeps the original phrase.
      expect(cleanName("SET 5").length).toBeGreaterThan(0);
    });
  });

  // Validates: Requirements 9.5
  test("generation over a full fixture yields at least 150 entries", () => {
    const TOTAL = 160;
    const products: ManifestProduct[] = [];
    for (let i = 0; i < TOTAL; i += 1) {
      products.push(
        specToManifestProduct(
          { letter: LETTERS[i % LETTERS.length], words: ["sample", "gift"], images: [`coll/p${i}.webp`] },
          i,
        ),
      );
    }

    const { products: catalogue } = buildCatalog(makeManifest(products));

    expect(catalogue.length).toBe(TOTAL);
    expect(catalogue.length).toBeGreaterThanOrEqual(150);
  });
});
