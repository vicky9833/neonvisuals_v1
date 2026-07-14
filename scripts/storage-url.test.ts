/**
 * Property-based test for the storage URL helpers (`scripts/storage-url.ts`).
 *
 * Feature: image-catalog-rebuild — Property 6.
 *
 * Property 6: Image URL construction is valid and never stale.
 *   For any relative storage path, `img(path)` returns a URL that begins with
 *   `${STORAGE_BASE}/`, contains no double slash after the base, strips leading
 *   slashes from the input, and never matches the pre-rebuild SKU-folder layout
 *   `product-images/NV-<LETTER><digits>/` when given a slugified relative path
 *   (i.e. the helper faithfully joins base + path).
 *
 * Validates: Requirements 13.1, 13.4, 16.4, 24.5.
 *
 * This exercises the pure `img` helper against the canonical `STORAGE_BASE`
 * (no filesystem or network side effects). The property runs >= 100 iterations
 * via fast-check.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { img, STORAGE_BASE } from "./storage-url";

const NUM_RUNS = 100;

/** The pre-rebuild SKU-folder layout that must never reappear (Req 24.5). */
const STALE_SKU_FOLDER = /\/NV-[A-Z]\d+\//;

/**
 * A well-formed slugified path segment: one or more `[a-z0-9]` groups joined by
 * single hyphens, with no leading/trailing/consecutive hyphens. Mirrors what
 * the restructure step emits for non-file segments.
 */
const slugSegmentArb: fc.Arbitrary<string> = fc
  .array(
    fc.stringMatching(/^[a-z0-9]+$/).filter((s) => s.length > 0 && s.length <= 12),
    { minLength: 1, maxLength: 4 },
  )
  .map((groups) => groups.join("-"));

const IMAGE_EXTENSIONS = [".webp", ".jpg", ".jpeg", ".avif", ".png"] as const;

/** A well-formed slugified file segment: slug base + preserved lowercase ext. */
const fileSegmentArb: fc.Arbitrary<string> = fc
  .tuple(slugSegmentArb, fc.constantFrom(...IMAGE_EXTENSIONS))
  .map(([base, ext]) => `${base}${ext}`);

/**
 * A slugified relative storage path (object key) of the shape the pipeline
 * produces: `<slug>/…/<file>` with one to five leading directory segments and a
 * final file segment.
 */
const relativePathArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.array(slugSegmentArb, { minLength: 1, maxLength: 5 }),
    fileSegmentArb,
  )
  .map(([dirs, file]) => [...dirs, file].join("/"));

describe("Feature: image-catalog-rebuild, Property 6 — image URL construction is valid and never stale", () => {
  it("joins the storage base and a relative path into a valid, non-stale URL", () => {
    fc.assert(
      fc.property(relativePathArb, (relativePath) => {
        const url = img(relativePath);

        // Begins with the storage base followed by exactly one slash (Req 13.1, 13.4, 16.4).
        expect(url.startsWith(`${STORAGE_BASE}/`)).toBe(true);

        // No double slash anywhere after the protocol's `https://`.
        const afterProtocol = url.slice("https://".length);
        expect(afterProtocol).not.toContain("//");

        // The helper faithfully joins base + relative path.
        expect(url).toBe(`${STORAGE_BASE}/${relativePath}`);

        // Never reproduces the pre-rebuild `NV-<LETTER><digits>/` SKU-folder layout (Req 24.5).
        expect(STALE_SKU_FOLDER.test(url)).toBe(false);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("strips any number of leading slashes from the input so the base join never doubles up", () => {
    fc.assert(
      fc.property(
        relativePathArb,
        fc.integer({ min: 1, max: 5 }),
        (relativePath, leadingSlashes) => {
          const withLeading = `${"/".repeat(leadingSlashes)}${relativePath}`;
          const url = img(withLeading);

          // Leading slashes are stripped: identical to the un-prefixed input.
          expect(url).toBe(`${STORAGE_BASE}/${relativePath}`);
          expect(url).toBe(img(relativePath));

          // Still exactly one slash after the base — no `product-images//…`.
          expect(url.startsWith(`${STORAGE_BASE}/`)).toBe(true);
          expect(url.slice(`${STORAGE_BASE}/`.length).startsWith("/")).toBe(false);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
