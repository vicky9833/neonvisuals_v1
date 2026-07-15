/**
 * Property-based tests for the image-manifest folder-count derivation of the
 * restructure script (`scripts/restructure-images.ts`).
 *
 * Feature: image-catalog-rebuild — Property 20.
 *
 * Property 20 (Manifest folder counts match the tree):
 *   For any generated tree, `folderCounts[f]` equals the number of image files
 *   directly contained in folder `f`. Concretely, `buildFolderCounts` attributes
 *   each image relative path to its immediate parent folder (its POSIX dirname),
 *   and the per-folder totals equal the number of images in that folder.
 *
 * Validates: Requirements 5.2
 *
 * The property runs >= 100 iterations via fast-check and exercises both
 * `buildFolderCounts` directly and its use inside `assembleManifest` (where the
 * counts must cover product images and kit-hero images across the whole tree).
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import {
  buildFolderCounts,
  assembleManifest,
  type ManifestProduct,
  type ManifestSummary,
} from "./restructure-images";

const NUM_RUNS = 100;

/** A slug-safe path segment; a small pool so folders/collisions recur. */
const segment = fc.constantFrom(
  "onboarding",
  "milestone",
  "one-year",
  "product-x",
  "set-1",
  "set-2",
  "a",
  "b",
  "c",
);

/** A slugified image file name (base + supported extension). */
const fileName = fc
  .tuple(
    fc.constantFrom("img", "photo", "hero", "a", "b"),
    fc.constantFrom(".webp", ".jpg", ".jpeg", ".png", ".avif"),
  )
  .map(([base, ext]) => `${base}${ext}`);

/** A relative image path nested 1–4 folders deep (always has a parent folder). */
const nestedImagePath = fc
  .tuple(fc.array(segment, { minLength: 1, maxLength: 4 }), fileName)
  .map(([folders, name]) => `${folders.join("/")}/${name}`);

/**
 * An image path that may be at the tree root (bare file name, no slash) so the
 * root-folder key ("") is exercised too, or nested.
 */
const anyImagePath = fc.oneof(nestedImagePath, fileName);

/**
 * Independent oracle: group image relative paths by their immediate parent
 * folder (everything before the last "/"; "" for a bare file name) and count
 * how many images fall directly in each folder.
 */
function expectedFolderCounts(paths: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const path of paths) {
    const idx = path.lastIndexOf("/");
    const folder = idx >= 0 ? path.slice(0, idx) : "";
    counts[folder] = (counts[folder] ?? 0) + 1;
  }
  return counts;
}

const EMPTY_SUMMARY: ManifestSummary = {
  foldersProcessed: 0,
  filesCopied: 0,
  filesSkippedMp4: 0,
  filesSkippedOther: 0,
  errors: 0,
  unmatchedTopLevelFolders: [],
};

describe("Feature: image-catalog-rebuild, Property 20 — manifest folder counts match the tree", () => {
  it("buildFolderCounts attributes each image to its immediate parent folder", () => {
    fc.assert(
      fc.property(
        fc.array(anyImagePath, { minLength: 0, maxLength: 80 }),
        (paths) => {
          const counts = buildFolderCounts(paths);
          const expected = expectedFolderCounts(paths);

          // Same set of folder keys.
          expect(new Set(Object.keys(counts))).toEqual(
            new Set(Object.keys(expected)),
          );

          // Each folder's count equals the number of images whose immediate
          // parent is exactly that folder.
          for (const [folder, count] of Object.entries(expected)) {
            expect(counts[folder]).toBe(count);
          }

          // Totals across all folders equal the total number of images (every
          // image is attributed to exactly one folder).
          const total = Object.values(counts).reduce((a, b) => a + b, 0);
          expect(total).toBe(paths.length);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("no folder count exceeds the number of images actually in that folder", () => {
    fc.assert(
      fc.property(
        fc.array(nestedImagePath, { minLength: 1, maxLength: 80 }),
        (paths) => {
          const counts = buildFolderCounts(paths);
          for (const [folder, count] of Object.entries(counts)) {
            const actual = paths.filter((p) => {
              const idx = p.lastIndexOf("/");
              return (idx >= 0 ? p.slice(0, idx) : "") === folder;
            }).length;
            expect(count).toBe(actual);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("assembleManifest derives folderCounts over product and kit-hero images", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            images: fc.array(nestedImagePath, { minLength: 0, maxLength: 8 }),
          }),
          { minLength: 0, maxLength: 12 },
        ),
        fc.array(nestedImagePath, { minLength: 0, maxLength: 12 }),
        (productImageGroups, kitHeroImages) => {
          const products: ManifestProduct[] = productImageGroups.map(
            (group, index) => ({
              collectionLetter: "A",
              storageSlug: "onboarding",
              productSlug: `product-${index}`,
              sourcePath: `neonvisualsfinal/ON BOARDING KIT/product ${index}`,
              variantSets: [],
              images: group.images,
            }),
          );

          const manifest = assembleManifest({
            products,
            kitHeroImages,
            summary: EMPTY_SUMMARY,
          });

          const allImagePaths = [
            ...products.flatMap((product) => product.images),
            ...kitHeroImages,
          ];

          // The manifest's folder counts equal the counts over the whole tree
          // (every product image plus every kit-hero image).
          expect(manifest.folderCounts).toEqual(
            expectedFolderCounts(allImagePaths),
          );

          // The counts account for exactly every image in the tree.
          const total = Object.values(manifest.folderCounts).reduce(
            (a, b) => a + b,
            0,
          );
          expect(total).toBe(allImagePaths.length);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
