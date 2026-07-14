/**
 * Property-based tests for the pure slugification foundations of the restructure
 * script (`scripts/restructure-images.ts`).
 *
 * Feature: image-catalog-rebuild — Properties 1, 2, 3.
 *
 * These cover the pure logic only (no filesystem side effects):
 *   - Property 1: `slugify` produces only URL-safe characters.
 *   - Property 2: `slugifyFileName` preserves the (case-normalised) extension.
 *   - Property 3: `NameAllocator` resolves collisions to unique names.
 *
 * Each property runs >= 100 iterations via fast-check.
 */

import { extname } from "node:path";
import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { slugify, slugifyFileName, NameAllocator } from "./restructure-images";

const NUM_RUNS = 100;

/**
 * A well-formed slug: only `[a-z0-9]` groups joined by single hyphens, with no
 * leading/trailing/consecutive hyphens. The empty string is also valid (an input
 * with no slug-able characters collapses to "").
 */
const VALID_SLUG = /^([a-z0-9]+(-[a-z0-9]+)*)?$/;

const IMAGE_EXTENSIONS = [
  ".webp",
  ".jpg",
  ".jpeg",
  ".avif",
  ".png",
  ".WEBP",
  ".JPG",
  ".JPEG",
  ".PNG",
  ".Png",
] as const;

describe("Feature: image-catalog-rebuild, Property 1 — slugify produces only URL-safe characters", () => {
  it("returns only [a-z0-9-] with no uppercase, whitespace, or stray hyphens", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = slugify(input);

        // Only characters in the allowed set.
        expect(result).toMatch(/^[a-z0-9-]*$/);
        // No uppercase and no whitespace survive.
        expect(result).toBe(result.toLowerCase());
        expect(result).not.toMatch(/\s/);
        // No consecutive hyphens and no leading/trailing hyphens.
        expect(result).not.toMatch(/--/);
        expect(result.startsWith("-")).toBe(false);
        expect(result.endsWith("-")).toBe(false);
        // The composite well-formed-slug shape.
        expect(result).toMatch(VALID_SLUG);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("Feature: image-catalog-rebuild, Property 2 — filename slugification preserves the extension", () => {
  it("keeps the case-normalised extension and slugifies the base", () => {
    fc.assert(
      fc.property(
        // A non-empty base name so the generated file name always has a real
        // extension, plus an extension drawn from the supported set (mixed case).
        fc.string({ minLength: 1 }),
        fc.constantFrom(...IMAGE_EXTENSIONS),
        (base, ext) => {
          const fileName = `${base}${ext}`;
          const originalExt = extname(fileName);

          // Precondition: the constructed name genuinely has an extension.
          // (extname treats leading-dot-only names as having none.)
          fc.pre(originalExt.length > 0);

          const result = slugifyFileName(fileName);
          const expectedExt = originalExt.toLowerCase();

          // The extension is preserved, case-normalised to lowercase.
          expect(result.endsWith(expectedExt)).toBe(true);

          // The base portion (everything before the extension) is a valid slug.
          const resultBase = result.slice(0, result.length - expectedExt.length);
          expect(resultBase).toMatch(VALID_SLUG);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("Feature: image-catalog-rebuild, Property 3 — destination name collisions resolve to unique names", () => {
  it("assigns a unique destination name for every source file in a folder", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 50 }),
        (sourceNames) => {
          const allocator = new NameAllocator(() => {
            /* silence collision logs during the test */
          });
          const folder = "dest";

          const assigned = sourceNames.map((name) =>
            allocator.allocate(folder, slugifyFileName(name)),
          );

          // No duplicates: the set of assigned names has the same size as the
          // number of source files.
          expect(new Set(assigned).size).toBe(assigned.length);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("keeps allocations independent across different destination folders", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 25 }),
        (sourceNames) => {
          const allocator = new NameAllocator(() => {});
          const desired = sourceNames.map((n) => slugifyFileName(n));

          const folderA = desired.map((d) => allocator.allocate("a", d));
          const folderB = desired.map((d) => allocator.allocate("b", d));

          // Each folder is internally unique...
          expect(new Set(folderA).size).toBe(folderA.length);
          expect(new Set(folderB).size).toBe(folderB.length);
          // ...and the two folders resolve identically (no cross-folder state).
          expect(folderB).toEqual(folderA);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
