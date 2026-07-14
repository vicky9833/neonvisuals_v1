import { describe, expect, it } from "vitest";

import { BUCKETS } from "@/data/buckets";
import { COLLECTION_MAP } from "../../scripts/restructure-images";
import type { BucketCode } from "@/lib/types/product";

/**
 * Unit tests for the collections data (`src/data/buckets.ts`).
 *
 * Validates Requirements 17.1, 17.2, 17.4:
 *   - 17.1 Exactly 11 collections with codes A-K.
 *   - 17.2 Each collection's display `name` equals its mapped display name
 *          (authoritative source: `COLLECTION_MAP` in the restructure script).
 *   - 17.4 Each collection retains its Route_Slug (`slug`) so existing
 *          `/collections/[slug]` URLs and `generateStaticParams` resolve.
 */

/** The eleven collection codes A-K, in order. */
const EXPECTED_CODES: readonly BucketCode[] = [
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

/**
 * Authoritative letter → display name lookup derived from `COLLECTION_MAP`.
 * `COLLECTION_MAP` is keyed by source folder name; re-key it by letter so the
 * test asserts against the single source of truth rather than duplicated copy.
 */
const DISPLAY_NAME_BY_LETTER: Record<string, string> = Object.fromEntries(
  Object.values(COLLECTION_MAP).map((entry) => [entry.letter, entry.displayName]),
);

describe("BUCKETS collections data", () => {
  it("defines exactly 11 collections (Req 17.1)", () => {
    expect(BUCKETS).toHaveLength(11);
  });

  it("uses codes A-K, each exactly once (Req 17.1)", () => {
    const codes = BUCKETS.map((bucket) => bucket.code);
    // Every expected code is present.
    expect([...codes].sort()).toEqual([...EXPECTED_CODES].sort());
    // No duplicate codes.
    expect(new Set(codes).size).toBe(EXPECTED_CODES.length);
  });

  it("maps every display name to the authoritative COLLECTION_MAP (Req 17.2)", () => {
    for (const bucket of BUCKETS) {
      expect(bucket.name).toBe(DISPLAY_NAME_BY_LETTER[bucket.code]);
    }
  });

  it("matches the exact expected display names (Req 17.2)", () => {
    const expectedNames: Record<BucketCode, string> = {
      A: "Welcome & Onboarding",
      B: "Milestone & Anniversary",
      C: "CEO & Leadership Recognition",
      D: "Festive & Seasonal",
      E: "Client Appreciation",
      F: "Experience Kits",
      G: "Tech-Forward & Digital",
      H: "Sustainability & Eco",
      I: "Events & General Gifts",
      J: "College Events",
      K: "Visiting Cards & Business Stationery",
    };
    for (const bucket of BUCKETS) {
      expect(bucket.name).toBe(expectedNames[bucket.code]);
    }
  });

  it("preserves a non-empty Route_Slug for every collection (Req 17.4)", () => {
    for (const bucket of BUCKETS) {
      expect(typeof bucket.slug).toBe("string");
      expect(bucket.slug.length).toBeGreaterThan(0);
    }
  });

  it("keeps all Route_Slugs unique (Req 17.4)", () => {
    const slugs = BUCKETS.map((bucket) => bucket.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
