// @vitest-environment jsdom
/**
 * UI test: the collection product listing renders through ProductCard.
 *
 * The collection detail page (`app/(marketing)/collections/[slug]/page.tsx`)
 * renders its products via `<ProductGrid products={products} />`, and
 * ProductGrid is the component that fans each product out to the fixed
 * ProductCard. This test verifies that delegation, covering the collection
 * page's use of ProductCard.
 *
 * Feature: image-catalog-rebuild (task 15.5)
 * Requirements: 21.1
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import type { Product } from "@/lib/types/product";

// Reveal is a client scroll-in wrapper; render its children directly.
vi.mock("@/components/marketing/reveal", () => ({
  Reveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Sentinel ProductCard so we can assert ProductGrid delegates to it.
vi.mock("@/components/products/product-card", () => ({
  ProductCard: ({ product }: { product: Product }) => (
    <div data-testid="product-card">{product.sku}</div>
  ),
}));

import { ProductGrid } from "./product-grid";

const products: Product[] = [
  {
    id: "NV-A-001",
    sku: "NV-A-001",
    name: "Copper Bottle",
    slug: "copper-bottle",
    bucket: "A",
    description: "A premium engraved copper bottle.",
    imageUrl: "https://cdn.example.com/product-images/onboarding/copper-bottle/1.webp",
    galleryImages: [],
  },
  {
    id: "NV-A-002",
    sku: "NV-A-002",
    name: "Leather Portfolio",
    slug: "leather-portfolio",
    bucket: "A",
    description: "An embossed leather portfolio.",
    imageUrl: "https://cdn.example.com/product-images/onboarding/leather-portfolio/1.webp",
    galleryImages: [],
  },
];

afterEach(() => {
  cleanup();
});

describe("ProductGrid (collection page product listing)", () => {
  it("renders every product through ProductCard (Req 21.1)", () => {
    render(<ProductGrid products={products} />);
    const cards = screen.getAllByTestId("product-card");
    expect(cards).toHaveLength(products.length);
    expect(cards.map((c) => c.textContent)).toEqual(["NV-A-001", "NV-A-002"]);
  });
});
