// @vitest-environment jsdom
/**
 * UI tests for ProductCard image presentation.
 * Feature: image-catalog-rebuild (task 15.5)
 * Requirements: 18.1, 18.2, 18.3, 18.4
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import type { Product } from "@/lib/types/product";

// next/image mock - surfaces className, sizes and the `fill` prop as attributes.
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const src = typeof props.src === "string" ? props.src : "";
    return (
      <img
        src={src}
        alt={props.alt as string}
        className={props.className as string}
        data-sizes={props.sizes as string}
        data-fill={props.fill ? "true" : "false"}
      />
    );
  },
}));

// next/link mock - renders a plain anchor.
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={typeof href === "string" ? href : ""}>{children}</a>
  ),
}));

// Isolate from the full catalog data set.
vi.mock("@/lib/catalog", () => ({
  getBucketByCode: () => ({ code: "A", name: "Welcome & Onboarding" }),
}));

import { ProductCard } from "./product-card";

const baseProduct: Product = {
  id: "NV-A-001",
  sku: "NV-A-001",
  name: "Copper Bottle",
  slug: "copper-bottle",
  bucket: "A",
  description: "A premium engraved copper bottle.",
  imageUrl: "https://cdn.example.com/product-images/onboarding/copper-bottle/1.webp",
  galleryImages: [],
};

afterEach(() => {
  cleanup();
});

describe("ProductCard image presentation", () => {
  it("renders the image container as aspect-square, overflow-hidden, rounded-lg on #FAFAF8 with #EDE9E3 border (Req 18.1)", () => {
    render(<ProductCard product={baseProduct} />);
    const img = screen.getByAltText(/Copper Bottle - personalised corporate gift/i);
    const containerEl = img.parentElement as HTMLElement;
    expect(containerEl.className).toContain("aspect-square");
    expect(containerEl.className).toContain("overflow-hidden");
    expect(containerEl.className).toContain("rounded-lg");
    expect(containerEl.className).toContain("bg-[#FAFAF8]");
    expect(containerEl.className).toContain("border-[#EDE9E3]");
  });

  it("renders the image object-contain with p-3 and a scale-105 hover transform (Req 18.2)", () => {
    render(<ProductCard product={baseProduct} />);
    const img = screen.getByAltText(/Copper Bottle - personalised corporate gift/i);
    expect(img.className).toContain("object-contain");
    expect(img.className).toContain("p-3");
    expect(img.className).toContain("group-hover:scale-105");
  });

  it("uses next/image with the fill prop and a sizes attribute (Req 18.3)", () => {
    render(<ProductCard product={baseProduct} />);
    const img = screen.getByAltText(/Copper Bottle - personalised corporate gift/i);
    expect(img.getAttribute("data-fill")).toBe("true");
    expect(img.getAttribute("data-sizes")).toBeTruthy();
  });

  it("renders the PlaceholderImage when the product has no imageUrl (Req 18.4)", () => {
    const noImage: Product = { ...baseProduct, imageUrl: undefined };
    render(<ProductCard product={noImage} />);
    // No <img> from next/image; the branded placeholder exposes role="img".
    expect(screen.queryByAltText(/personalised corporate gift/i)).toBeNull();
    const placeholder = screen.getByRole("img", { name: /Copper Bottle - image coming soon/i });
    expect(placeholder).not.toBeNull();
  });
});
