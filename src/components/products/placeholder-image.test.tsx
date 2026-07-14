// @vitest-environment jsdom
/**
 * UI tests for PlaceholderImage - the branded fallback.
 * Feature: image-catalog-rebuild (task 15.5)
 * Requirements: 22.1, 22.2, 22.3
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { PlaceholderImage } from "./placeholder-image";

afterEach(() => {
  cleanup();
});

describe("PlaceholderImage", () => {
  it("renders on a warm neutral #FAFAF8 surface with an #EDE9E3 border (Req 22.1)", () => {
    const { container } = render(<PlaceholderImage name="Copper Bottle" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toContain("bg-[#FAFAF8]");
    expect(root.className).toContain("border-[#EDE9E3]");
  });

  it("renders a centered gift icon (Req 22.1)", () => {
    const { container } = render(<PlaceholderImage name="Copper Bottle" />);
    // The lucide Gift icon renders as an <svg>.
    const icon = container.querySelector("svg");
    expect(icon).not.toBeNull();
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("items-center");
    expect(root.className).toContain("justify-center");
  });

  it("fills its relatively-positioned parent via absolute inset-0 (Req 22.2)", () => {
    const { container } = render(<PlaceholderImage name="Copper Bottle" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("absolute");
    expect(root.className).toContain("inset-0");
  });

  it("exposes an accessible label that includes the product name (Req 22.3)", () => {
    render(<PlaceholderImage name="Leather Portfolio" />);
    const el = screen.getByRole("img", { name: /Leather Portfolio/i });
    expect(el).not.toBeNull();
    expect(el.getAttribute("aria-label")).toContain("Leather Portfolio");
  });
});
