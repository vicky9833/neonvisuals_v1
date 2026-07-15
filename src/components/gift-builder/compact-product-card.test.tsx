// @vitest-environment jsdom
/**
 * UI tests for the gift-builder CompactProductCard image presentation.
 * Feature: image-catalog-rebuild (task 15.5)
 * Requirements: 20.1, 20.2
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import type { Product } from "@/lib/types/product";

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

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={typeof href === "string" ? href : ""}>{children}</a>
  ),
}));

vi.mock("@/lib/catalog", () => ({
  getBucketByCode: () => ({ code: "A", name: "Welcome & Onboarding" }),
}));

import { CompactProductCard } from "./compact-product-card";

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

describe("CompactProductCard image presentation", () => {
  it("renders the image object-contain with padding on a #FAFAF8 / #EDE9E3 container (Req 20.1)", () => {
    render(
      <CompactProductCard product={baseProduct} added={false} onToggle={() => {}} />,
    );
    const img = screen.getByAltText("Copper Bottle");
    expect(img.className).toContain("object-contain");
    expect(img.className).toContain("p-3");
    const containerEl = img.parentElement as HTMLElement;
    expect(containerEl.className).toContain("bg-[#FAFAF8]");
    expect(containerEl.className).toContain("border-[#EDE9E3]");
  });

  it("renders the PlaceholderImage when the product has no imageUrl (Req 20.2)", () => {
    const noImage: Product = { ...baseProduct, imageUrl: undefined };
    render(<CompactProductCard product={noImage} added={false} onToggle={() => {}} />);
    expect(screen.queryByAltText("Copper Bottle")).toBeNull();
    const placeholder = screen.getByRole("img", {
      name: /Copper Bottle - image coming soon/i,
    });
    expect(placeholder).not.toBeNull();
  });
});
