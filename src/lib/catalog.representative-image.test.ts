/**
 * Property test for collection representative-image resolution.
 *
 * Feature: image-catalog-rebuild - Property 21 (collection representative image).
 *
 * Covered spec task:
 *   - 12.5 - Property 21: "Every collection has a valid representative image."
 *            For any collection, its representative image equals the `imageUrl`
 *            of its first product, or - when the collection has no product image
 *            - a member of `kitHeroImages`, and always begins with the storage
 *            base. (Validates: Requirements 17.5, 15.1)
 *
 * The property drives the pure resolution rule
 * ({@link resolveRepresentativeImage}) - which `getCollectionRepresentativeImage`
 * delegates to - over synthetic `Product[]` / `kitHeroImages` inputs, so it
 * never couples to the committed data files. It runs >= 100 iterations.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { resolveRepresentativeImage } from "@/lib/catalog";
import { STORAGE_BASE } from "../../scripts/storage-url";
import type { BucketCode, Product } from "@/lib/types/product";

const NUM_RUNS = 200;

const BUCKET_CODES: readonly BucketCode[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
];

/** A relative storage path, as produced by the restructure step (slug segments). */
const relativePathArb: fc.Arbitrary<string> = fc
  .array(
    fc
      .stringMatching(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      .filter((s) => s.length > 0 && s.length <= 24),
    { minLength: 1, maxLength: 4 },
  )
  .map((segments) => `${segments.join("/")}.webp`);

/** A fully-qualified storage URL on {@link STORAGE_BASE} (mirrors `img(path)`). */
const storageUrlArb: fc.Arbitrary<string> = relativePathArb.map(
  (path) => `${STORAGE_BASE}/${path}`,
);

const bucketCodeArb: fc.Arbitrary<BucketCode> = fc.constantFrom(
  ...BUCKET_CODES,
);

let productSeq = 0;

/**
 * A minimal-but-valid {@link Product}. `imageUrl` is present iff `image` is
 * supplied, letting the generator model both "has image" and "no image" cases.
 */
function makeProduct(bucket: BucketCode, image: string | undefined): Product {
  productSeq += 1;
  const base: Product = {
    id: `NV-${bucket}-${String(productSeq).padStart(3, "0")}`,
    sku: `NV-${bucket}-${String(productSeq).padStart(3, "0")}`,
    name: `Product ${productSeq}`,
    slug: `product-${productSeq}`,
    bucket,
    description: "A synthetic product for property testing.",
  };
  return image === undefined ? base : { ...base, imageUrl: image };
}

/** Arbitrary product carrying a random bucket and an optional image URL. */
const productArb: fc.Arbitrary<Product> = fc
  .tuple(bucketCodeArb, fc.option(storageUrlArb, { nil: undefined }))
  .map(([bucket, image]) => makeProduct(bucket, image));

describe("resolveRepresentativeImage - Property 21: every collection has a valid representative image", () => {
  it("resolves to the first product image, else a kitHeroImages member, and is always on the storage base", () => {
    fc.assert(
      fc.property(
        fc.array(productArb, { maxLength: 30 }),
        fc.array(storageUrlArb, { maxLength: 6 }),
        bucketCodeArb,
        (products, kitHeroImages, code) => {
          const result = resolveRepresentativeImage(
            products,
            kitHeroImages,
            code,
          );

          const firstWithImage = products.find(
            (p) => p.bucket === code && Boolean(p.imageUrl),
          );

          if (firstWithImage) {
            // 1. Deterministically the first product image for the collection.
            expect(result).toBe(firstWithImage.imageUrl);
            expect(result?.startsWith(`${STORAGE_BASE}/`)).toBe(true);
          } else if (kitHeroImages.length > 0) {
            // 2. Fallback: a member of kitHeroImages (the first entry).
            expect(result).toBe(kitHeroImages[0]);
            expect(kitHeroImages).toContain(result);
            expect(result?.startsWith(`${STORAGE_BASE}/`)).toBe(true);
          } else {
            // 3. Neither exists → undefined (caller renders placeholder).
            expect(result).toBeUndefined();
          }

          // Determinism: identical inputs always yield the identical result.
          expect(resolveRepresentativeImage(products, kitHeroImages, code)).toBe(
            result,
          );
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("guarantees a defined storage-base URL whenever the collection has a product image or a kit hero exists", () => {
    fc.assert(
      fc.property(
        bucketCodeArb,
        storageUrlArb,
        fc.array(storageUrlArb, { maxLength: 4 }),
        (code, guaranteedImage, kitHeroImages) => {
          // A collection product that definitely has an image.
          const products: Product[] = [makeProduct(code, guaranteedImage)];
          const result = resolveRepresentativeImage(
            products,
            kitHeroImages,
            code,
          );
          expect(result).toBe(guaranteedImage);
          expect(result).toBeDefined();
          expect(result?.startsWith(`${STORAGE_BASE}/`)).toBe(true);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
