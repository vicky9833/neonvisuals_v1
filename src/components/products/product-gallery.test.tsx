// @vitest-environment jsdom
/**
 * UI tests for the ProductGallery detail-page gallery.
 * Feature: image-catalog-rebuild (task 15.5)
 * Requirements: 19.1, 19.2, 19.3, 19.4
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

// next/image mock - surfaces className/sizes/fill as attributes.
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

import { ProductGallery } from "./product-gallery";

const MAIN = "https://cdn.example.com/product-images/onboarding/bottle/main.webp";
const GALLERY = [
  "https://cdn.example.com/product-images/onboarding/bottle/2.webp",
  "https://cdn.example.com/product-images/onboarding/bottle/3.webp",
];

afterEach(() => {
  cleanup();
});

describe("ProductGallery", () => {
  it("renders the main image container aspect-square max-w-[600px] with an object-contain p-6 image (Req 19.1)", () => {
    const { container } = render(
      <ProductGallery name="Bottle" imageUrl={MAIN} galleryImages={GALLERY} />,
    );
    const mainImg = screen.getByAltText("Bottle - view 1");
    const mainContainer = mainImg.parentElement as HTMLElement;
    expect(mainContainer.className).toContain("aspect-square");
    expect(mainContainer.className).toContain("max-w-[600px]");
    expect(mainImg.className).toContain("object-contain");
    expect(mainImg.className).toContain("p-6");
    // sanity: container root should exist
    expect(container.firstElementChild).not.toBeNull();
  });

  it("renders a w-20 h-20 object-contain thumbnail strip when gallery images exist (Req 19.2)", () => {
    render(<ProductGallery name="Bottle" imageUrl={MAIN} galleryImages={GALLERY} />);
    const thumbButtons = screen.getAllByRole("button", { name: /View image/i });
    // images = [main, ...gallery] => 3 thumbnails
    expect(thumbButtons).toHaveLength(3);
    for (const btn of thumbButtons) {
      expect(btn.className).toContain("h-20");
      expect(btn.className).toContain("w-20");
    }
    const thumbImg = screen.getByAltText("Bottle thumbnail 1");
    expect(thumbImg.className).toContain("object-contain");
  });

  it("swaps the main image and sets active #C4A35A / inactive #EDE9E3 borders on selection (Req 19.3)", () => {
    render(<ProductGallery name="Bottle" imageUrl={MAIN} galleryImages={GALLERY} />);

    // Initially the first thumbnail is active.
    const first = screen.getByRole("button", { name: "View image 1" });
    const third = screen.getByRole("button", { name: "View image 3" });
    expect(first.className).toContain("border-[#C4A35A]");
    expect(third.className).toContain("border-[#EDE9E3]");
    expect(screen.getByAltText("Bottle - view 1").getAttribute("src")).toBe(MAIN);

    // Select the third thumbnail.
    fireEvent.click(third);

    // Main image swaps to the third source and its alt reflects the new index.
    const swapped = screen.getByAltText("Bottle - view 3");
    expect(swapped.getAttribute("src")).toBe(GALLERY[1]);

    // Active border moves to the third thumbnail; the first becomes inactive.
    expect(third.className).toContain("border-[#C4A35A]");
    expect(first.className).toContain("border-[#EDE9E3]");
  });

  it("renders no thumbnail strip when there are no gallery images (Req 19.4)", () => {
    render(<ProductGallery name="Bottle" imageUrl={MAIN} galleryImages={[]} />);
    // Main image still renders.
    expect(screen.getByAltText("Bottle - view 1")).not.toBeNull();
    // No thumbnail buttons.
    expect(screen.queryAllByRole("button", { name: /View image/i })).toHaveLength(0);
  });
});
