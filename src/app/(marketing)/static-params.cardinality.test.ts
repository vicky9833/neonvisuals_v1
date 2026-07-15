/**
 * Property-based test for the public route `generateStaticParams` functions.
 *
 * Feature: image-catalog-rebuild - Property 22.
 *
 * Property 22 (generateStaticParams cardinality is exact):
 *   `generateStaticParams` for the product `[slug]` route returns exactly one
 *   entry per product slug, and for the collection `[slug]` route returns
 *   exactly one entry per collection Route_Slug - no missing entries, no extras,
 *   and no duplicate slugs.
 *
 * This validates the cardinality contract of Requirement 24.4 against the live
 * data source (`PRODUCTS` / `BUCKETS` from `@/lib/catalog`) and the actual route
 * functions, so a drift between the catalogue and the statically-generated
 * params (which would silently drop or duplicate pages at build time) is caught.
 *
 * Each property runs >= 100 iterations via fast-check.
 *
 * Validates: Requirements 24.4
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { BUCKETS, PRODUCTS } from "@/lib/catalog";
import { generateStaticParams as collectionParams } from "./collections/[slug]/page";
import { generateStaticParams as productParams } from "./products/[slug]/page";

const NUM_RUNS = 100;

/** Count how many generated params carry a given slug. */
function countSlug(params: ReadonlyArray<{ slug: string }>, slug: string): number {
  return params.filter((p) => p.slug === slug).length;
}

describe("Feature: image-catalog-rebuild, Property 22 - generateStaticParams cardinality is exact", () => {
  describe("collection [slug] route", () => {
    const params = collectionParams();
    const bucketSlugs = BUCKETS.map((b) => b.slug);

    it("returns exactly one entry per collection Route_Slug (no missing, no extra)", () => {
      // Cardinality: one param per collection.
      expect(params).toHaveLength(BUCKETS.length);

      // Exact set equality between generated slugs and collection Route_Slugs.
      expect(new Set(params.map((p) => p.slug))).toEqual(new Set(bucketSlugs));
    });

    it("produces no duplicate slugs", () => {
      const slugs = params.map((p) => p.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it("maps every collection to exactly one param (pointwise, across all collections)", () => {
      fc.assert(
        fc.property(fc.nat({ max: BUCKETS.length - 1 }), (i) => {
          const slug = bucketSlugs[i];
          // Exactly one generated entry corresponds to this collection.
          expect(countSlug(params, slug)).toBe(1);
        }),
        { numRuns: NUM_RUNS },
      );
    });

    it("has no param that does not correspond to a real collection (surjective onto slugs)", () => {
      const bucketSlugSet = new Set(bucketSlugs);
      fc.assert(
        fc.property(fc.nat({ max: params.length - 1 }), (i) => {
          expect(bucketSlugSet.has(params[i].slug)).toBe(true);
        }),
        { numRuns: NUM_RUNS },
      );
    });
  });

  describe("product [slug] route", () => {
    const params = productParams();
    const productSlugs = PRODUCTS.map((p) => p.slug);

    it("returns exactly one entry per product slug (no missing, no extra)", () => {
      // Cardinality: one param per product.
      expect(params).toHaveLength(PRODUCTS.length);

      // Exact set equality between generated slugs and product slugs.
      expect(new Set(params.map((p) => p.slug))).toEqual(new Set(productSlugs));
    });

    it("produces no duplicate slugs", () => {
      const slugs = params.map((p) => p.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it("maps every product to exactly one param (pointwise, across all products)", () => {
      fc.assert(
        fc.property(fc.nat({ max: PRODUCTS.length - 1 }), (i) => {
          const slug = productSlugs[i];
          // Exactly one generated entry corresponds to this product.
          expect(countSlug(params, slug)).toBe(1);
        }),
        { numRuns: NUM_RUNS },
      );
    });

    it("has no param that does not correspond to a real product (surjective onto slugs)", () => {
      const productSlugSet = new Set(productSlugs);
      fc.assert(
        fc.property(fc.nat({ max: params.length - 1 }), (i) => {
          expect(productSlugSet.has(params[i].slug)).toBe(true);
        }),
        { numRuns: NUM_RUNS },
      );
    });
  });
});
