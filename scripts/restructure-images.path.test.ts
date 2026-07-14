/**
 * Property-based test for the pure storage-path construction of the restructure
 * script (`scripts/restructure-images.ts`).
 *
 * Feature: image-catalog-rebuild — Property 5.
 *
 * Property 5: Storage path shape is well-formed.
 *   For any detected product record, the constructed destination path equals
 *   `<collection-storage-slug>/[<tenure>/]<product-slug>/[<variant-slug>/]<file>`,
 *   omitting the variant segment when the product has no variant sets and
 *   including the tenure segment exactly when the product belongs to collection
 *   `B`.
 *
 * Validates: Requirements 3.2, 3.4.
 *
 * This exercises the pure `buildDestinationPath` builder over `DestinationPathParts`
 * (no filesystem side effects). The property runs >= 100 iterations via fast-check.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import {
  buildDestinationPath,
  slugify,
  slugifyFileName,
  COLLECTION_MAP,
  TENURE_FOLDERS,
  type CollectionMap,
  type DestinationPathParts,
} from "./restructure-images";

const NUM_RUNS = 100;

/**
 * A well-formed non-file slug segment: one or more `[a-z0-9]` groups joined by
 * single hyphens, with no leading/trailing/consecutive hyphens and no dot.
 */
const VALID_SLUG_SEGMENT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * A well-formed slugified file segment: a valid slug base, a single dot, and a
 * lowercase alphanumeric extension.
 */
const VALID_FILE_SEGMENT = /^[a-z0-9]+(-[a-z0-9]+)*\.[a-z0-9]+$/;

const IMAGE_EXTENSIONS = [
  ".webp",
  ".jpg",
  ".jpeg",
  ".avif",
  ".png",
  ".WEBP",
  ".JPG",
  ".PNG",
] as const;

/** Fixed storage slugs from the authoritative collection map (used verbatim). */
const COLLECTIONS: readonly CollectionMap[] = Object.values(COLLECTION_MAP);

/** The three collection-`B` tenure segments (`one-year`, `five-year`, `ten-year`). */
const TENURE_SEGMENTS: readonly string[] = Object.values(TENURE_FOLDERS).map(
  (t) => t.segment,
);

/**
 * A raw (unslugified) source name that is guaranteed to slugify to a non-empty
 * slug. Mixes lowercase, uppercase, digits, whitespace, and punctuation so the
 * builder's slugification is genuinely exercised, while the `.filter` discards
 * inputs that would collapse to an empty slug (which never occur for real
 * detected products/variants).
 */
const rawNameArb: fc.Arbitrary<string> = fc
  .array(
    fc.oneof(
      fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789".split("")),
      fc.constantFrom(..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")),
      fc.constantFrom(..." _-!@#.,()&+".split("")),
    ),
    { minLength: 1, maxLength: 24 },
  )
  .map((chars) => chars.join(""))
  .filter((s) => slugify(s).length > 0);

/** A raw source file name: a non-empty base plus a (mixed-case) image extension. */
const rawFileNameArb: fc.Arbitrary<string> = fc
  .tuple(rawNameArb, fc.constantFrom(...IMAGE_EXTENSIONS))
  .map(([base, ext]) => `${base}${ext}`);

describe("Feature: image-catalog-rebuild, Property 5 — storage path shape is well-formed", () => {
  it("produces <storage-slug>/[<tenure>/]<product>/[<variant>/]<file> with URL-safe, singly-slashed segments", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...COLLECTIONS),
        rawNameArb, // product name (raw)
        fc.option(rawNameArb, { nil: undefined }), // variant name (raw) or none
        // Tenure present ONLY for collection B (Req 3.4). Modelled by only
        // offering a tenure segment when the drawn collection is B.
        fc.option(fc.constantFrom(...TENURE_SEGMENTS), { nil: undefined }),
        rawFileNameArb,
        (collection, productName, variantName, maybeTenure, fileName) => {
          // Tenure is a collection-B-only concept: suppress it for every other
          // collection so the builder input mirrors real detected products.
          const tenureSegment =
            collection.letter === "B" ? maybeTenure : undefined;

          const parts: DestinationPathParts = {
            storageSlug: collection.storageSlug,
            productName,
            fileName,
            ...(tenureSegment !== undefined ? { tenureSegment } : {}),
            ...(variantName !== undefined ? { variantName } : {}),
          };

          const result = buildDestinationPath(parts);

          // Single forward-slash separators: no leading/trailing slash, no `//`.
          expect(result.startsWith("/")).toBe(false);
          expect(result.endsWith("/")).toBe(false);
          expect(result).not.toContain("//");

          const segments = result.split("/");
          // Every segment is non-empty (confirms single-slash separators).
          for (const segment of segments) {
            expect(segment.length).toBeGreaterThan(0);
          }

          // Build the expected ordered segment list from the shape spec.
          const expectedSegments: string[] = [collection.storageSlug];
          if (tenureSegment !== undefined) expectedSegments.push(tenureSegment);
          expectedSegments.push(slugify(productName));
          if (variantName !== undefined) {
            expectedSegments.push(slugify(variantName));
          }
          expectedSegments.push(slugifyFileName(fileName));

          // Exact shape: same ordered segments, joined by single slashes.
          expect(segments).toEqual(expectedSegments);
          expect(result).toBe(expectedSegments.join("/"));

          // Variant segment is present exactly when a variant name was provided.
          const variantSlug =
            variantName !== undefined ? slugify(variantName) : undefined;
          const hasVariant =
            variantSlug !== undefined && segments.includes(variantSlug);
          expect(hasVariant).toBe(variantName !== undefined);

          // Tenure segment is present exactly when provided (collection B only).
          expect(segments.includes(tenureSegment ?? "\u0000")).toBe(
            tenureSegment !== undefined,
          );
          if (tenureSegment === undefined) {
            // No stray tenure segment leaked into a non-B collection path.
            for (const t of TENURE_SEGMENTS) {
              // A tenure slug could legitimately equal a slugified product/variant
              // name, so only assert it never appears in the dedicated tenure
              // position (immediately after the storage slug).
              if (segments[1] === t) {
                expect(collection.letter).toBe("B");
              }
            }
          }

          // Every non-file segment is a well-formed slug; the final segment is a
          // well-formed slugified file name (base + preserved lowercase ext).
          const fileSegment = segments[segments.length - 1];
          const nonFileSegments = segments.slice(0, -1);
          for (const segment of nonFileSegments) {
            expect(segment).toMatch(VALID_SLUG_SEGMENT);
          }
          expect(fileSegment).toMatch(VALID_FILE_SEGMENT);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("omits the variant segment for flat-image products (no variant set)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...COLLECTIONS),
        rawNameArb,
        rawFileNameArb,
        (collection, productName, fileName) => {
          const result = buildDestinationPath({
            storageSlug: collection.storageSlug,
            productName,
            fileName,
          });

          // Flat product: exactly <storage-slug>/<product>/<file> — three segments.
          expect(result).toBe(
            [
              collection.storageSlug,
              slugify(productName),
              slugifyFileName(fileName),
            ].join("/"),
          );
          expect(result.split("/")).toHaveLength(3);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
