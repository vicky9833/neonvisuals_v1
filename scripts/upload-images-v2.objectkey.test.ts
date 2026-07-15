/**
 * Property-based test for the pure object-key derivation of the upload script
 * (`scripts/upload-images-v2.ts`).
 *
 * Feature: image-catalog-rebuild — Property 19.
 *
 * Property 19: Object key equals the relative POSIX path.
 *   For any local file under `product-images/`, the upload object key equals
 *   that file's path relative to `product-images/` using forward slashes.
 *
 * Validates: Requirements 8.2
 *
 * This covers the pure `deriveObjectKey` helper (no filesystem side effects).
 * Runs >= 100 iterations via fast-check.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { deriveObjectKey, LOCAL_ROOT } from "./upload-images-v2";

const NUM_RUNS = 100;

/**
 * A single path segment that is safe to appear in both POSIX and Windows paths:
 * non-empty, and free of slashes, backslashes, and the `.`-only names that would
 * make a relative path ambiguous.
 */
const SEGMENT = fc
  .string({ minLength: 1, maxLength: 12 })
  .filter((s) => !/[\\/]/.test(s) && s !== "." && s !== "..");

describe("Feature: image-catalog-rebuild, Property 19 — object key equals the relative POSIX path", () => {
  it("derives the forward-slash path relative to the local root", () => {
    fc.assert(
      fc.property(
        fc.array(SEGMENT, { minLength: 1, maxLength: 6 }),
        (segments) => {
          const relativePath = segments.join("/");
          // Build a file path beneath the root using the OS-native separator by
          // going through node's join (exercised indirectly via a forward-slash
          // path that deriveObjectKey must normalise).
          const filePath = `${LOCAL_ROOT}/${relativePath}`;

          const key = deriveObjectKey(LOCAL_ROOT, filePath);

          // The key equals the relative path with forward slashes.
          expect(key).toBe(relativePath);
          // And it never contains a backslash regardless of platform.
          expect(key).not.toContain("\\");
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("normalises Windows-style backslash paths to forward slashes", () => {
    fc.assert(
      fc.property(
        fc.array(SEGMENT, { minLength: 1, maxLength: 6 }),
        (segments) => {
          const relativePath = segments.join("/");
          // A backslash-separated file path under the root (as produced on
          // Windows) must yield the same forward-slash object key.
          const filePath = `${LOCAL_ROOT}\\${segments.join("\\")}`;

          const key = deriveObjectKey(LOCAL_ROOT, filePath);

          expect(key).toBe(relativePath);
          expect(key).not.toContain("\\");
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
