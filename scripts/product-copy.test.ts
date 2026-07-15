/**
 * Property-based test for price-free product copy (`scripts/product-copy.ts`).
 *
 * Feature: image-catalog-rebuild — Property 15.
 *
 * Property 15: Copy never contains price information.
 *   For any generated product, neither `tagline` nor `description` contains a
 *   currency symbol, currency code, or price/cost amount.
 *
 * Validates: Requirements 11.3
 *
 * The property runs >= 100 iterations via fast-check. It exercises three
 * facets of the price guard:
 *   (a) every authored PRODUCT_COPY entry is price-free;
 *   (b) for arbitrary product names/collections, both `buildFallbackCopy` and
 *       `getProductCopy` produce a non-empty, price-free tagline + description;
 *   (c) the price-token detector positively flags currency/price strings
 *       (negative control: `assertCopyPriceFree` throws on such copy).
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import {
  PRODUCT_COPY,
  getProductCopy,
  buildFallbackCopy,
  findPriceTokens,
  containsPriceToken,
  assertCopyPriceFree,
  assertAllCopyPriceFree,
  type ProductCopy,
} from "./product-copy";

const NUM_RUNS = 100;

/** Assert a resolved copy object is non-empty and free of any price token. */
function expectPriceFreeAndNonEmpty(copy: ProductCopy): void {
  expect(copy.tagline.trim().length).toBeGreaterThan(0);
  expect(copy.description.trim().length).toBeGreaterThan(0);
  expect(containsPriceToken(copy.tagline)).toBe(false);
  expect(containsPriceToken(copy.description)).toBe(false);
  expect(findPriceTokens(copy.tagline)).toEqual([]);
  expect(findPriceTokens(copy.description)).toEqual([]);
}

describe("Feature: image-catalog-rebuild, Property 15 — copy never contains price information", () => {
  it("(a) every authored PRODUCT_COPY entry is price-free", () => {
    // Guard over the whole authored map does not throw.
    expect(() => assertAllCopyPriceFree()).not.toThrow();

    // And each authored entry is individually non-empty and price-free.
    for (const [sku, copy] of Object.entries(PRODUCT_COPY)) {
      expect(() => assertCopyPriceFree(sku, copy)).not.toThrow();
      expectPriceFreeAndNonEmpty(copy);
    }
  });

  it("(b) buildFallbackCopy and getProductCopy yield non-empty, price-free copy for arbitrary names/collections", () => {
    fc.assert(
      fc.property(
        // Arbitrary raw product names (folder-derived), possibly messy.
        fc.string(),
        // Optional collection display name.
        fc.option(fc.string(), { nil: undefined }),
        // An arbitrary SKU that is almost never present in PRODUCT_COPY, so the
        // fallback path is exercised heavily; occasionally an authored SKU.
        fc.oneof(
          fc.constantFrom(...Object.keys(PRODUCT_COPY), "NV-Z-999"),
          fc.string(),
        ),
        (name, collection, sku) => {
          // Fallback copy directly.
          const fallback = buildFallbackCopy(name, collection);
          expectPriceFreeAndNonEmpty(fallback);
          expect(() => assertCopyPriceFree("NV-FALLBACK", fallback)).not.toThrow();

          // Resolved copy (authored or fallback) via getProductCopy.
          const { copy } = getProductCopy(sku, name, collection);
          expectPriceFreeAndNonEmpty(copy);
          expect(() => assertCopyPriceFree(sku, copy)).not.toThrow();
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("(c) the detector positively flags currency/price strings (negative control)", () => {
    // Templates that embed an arbitrary numeric amount to build price strings.
    const priceTemplates: readonly ((amount: string) => string)[] = [
      (a) => `Only ₹${a} for this piece`,
      (a) => `Just Rs ${a} per unit`,
      (a) => `Rs.${a} all inclusive`,
      (a) => `Priced at INR ${a}`,
      (a) => `$${a} flat`,
      (a) => `€${a} each`,
      (a) => `£${a} only`,
      (a) => `${a}/- per teammate`,
      (a) => `${a} rupees total`,
      (a) => `${a} dollars each`,
    ];

    // Vocabulary-only strings (no amount required to be flagged).
    const vocabularyStrings: readonly string[] = [
      "Best price guaranteed",
      "Pricing available on request",
      "Low cost option",
      "A costing breakdown follows",
      "Bulk discount applies",
      "The cheapest gift around",
      "Rupees well spent",
      "Paise saved is paise earned",
    ];

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999999 }),
        fc.oneof(
          fc.constantFrom(...priceTemplates),
          fc.constant<((amount: string) => string) | null>(null),
        ),
        fc.constantFrom(...vocabularyStrings),
        fc.boolean(),
        (amount, template, vocab, useTemplate) => {
          const offending =
            useTemplate && template ? template(String(amount)) : vocab;

          // The detector must positively flag the offending string.
          expect(containsPriceToken(offending)).toBe(true);
          expect(findPriceTokens(offending).length).toBeGreaterThan(0);

          // And the per-SKU guard must throw when such text appears in copy.
          const badTagline: ProductCopy = {
            tagline: offending,
            description: "A clean, price-free description of the gift.",
          };
          expect(() => assertCopyPriceFree("NV-BAD-001", badTagline)).toThrow();

          const badDescription: ProductCopy = {
            tagline: "A clean, price-free tagline.",
            description: offending,
          };
          expect(() => assertCopyPriceFree("NV-BAD-002", badDescription)).toThrow();
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

// ---------------------------------------------------------------------------
// Regression (Prompt 2, item 9): humaniseName must not crash on undefined name.
// Before the fix, buildFallbackCopy(undefined) → humaniseName(undefined) →
// undefined.replace(...) → TypeError. It must now yield safe generic copy.
// ---------------------------------------------------------------------------
describe("Item 9 — undefined/null name no longer crashes", () => {
  it("buildFallbackCopy(undefined) returns safe, non-empty, price-free copy", () => {
    const copy = buildFallbackCopy(undefined as unknown as string);
    expect(copy.tagline.trim().length).toBeGreaterThan(0);
    expect(copy.description.trim().length).toBeGreaterThan(0);
    expect(containsPriceToken(copy.tagline)).toBe(false);
    expect(containsPriceToken(copy.description)).toBe(false);
  });

  it("buildFallbackCopy(null) does not throw", () => {
    expect(() => buildFallbackCopy(null as unknown as string)).not.toThrow();
  });

  it("getProductCopy with an undefined name for an unauthored SKU falls back safely", () => {
    const { copy, usedFallback } = getProductCopy(
      "NV-Z-999",
      undefined as unknown as string,
    );
    expect(usedFallback).toBe(true);
    expect(copy.tagline.trim().length).toBeGreaterThan(0);
  });
});
