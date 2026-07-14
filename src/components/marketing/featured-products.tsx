"use client";

/**
 * FeaturedProducts - client-side category filter pills over a featured product
 * grid used on the homepage "Gifts Worth Keeping" section. No prices: each card
 * drives to the product detail page / enquiry.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/lib/types/product";
import { ProductCard } from "@/components/products/product-card";

type Predicate = (product: Product) => boolean;

interface Pill {
  label: string;
  match: Predicate;
}

/** Pill definitions with their predicate over a product. "All" matches every product. */
const PILLS: Pill[] = [
  { label: "All", match: () => true },
  { label: "Bottles", match: (p) => p.category === "Drinkware" },
  { label: "Diaries", match: (p) => p.category === "Stationery" },
  { label: "Pens", match: (p) => p.category === "Stationery" },
  { label: "Trophies", match: (p) => p.category === "Awards" },
  { label: "Apparel", match: (p) => p.category === "Apparel" },
  {
    label: "Eco Gifts",
    match: (p) => (p.tags?.includes("Eco Friendly") ?? false) || p.bucket === "H",
  },
  { label: "Tech", match: (p) => p.category === "Tech" || p.bucket === "G" },
];

export function FeaturedProducts({ products }: { products: Product[] }) {
  const [active, setActive] = useState("All");

  // Only surface a pill when at least one passed product matches it. "All" always shows.
  const visiblePills = useMemo(
    () =>
      PILLS.filter(
        (pill) => pill.label === "All" || products.some((p) => pill.match(p)),
      ),
    [products],
  );

  const activePill = visiblePills.find((p) => p.label === active) ?? visiblePills[0];

  const filtered = useMemo(
    () => (activePill ? products.filter((p) => activePill.match(p)) : products),
    [products, activePill],
  );

  return (
    <div>
      {/* Category filter pills */}
      <div className="flex flex-wrap justify-center gap-2.5">
        {visiblePills.map((pill) => {
          const isActive = pill.label === activePill?.label;
          return (
            <button
              key={pill.label}
              type="button"
              onClick={() => setActive(pill.label)}
              aria-pressed={isActive}
              className={
                isActive
                  ? "rounded-full bg-[#1A1A2E] px-5 py-2 text-sm font-semibold text-white transition-all duration-200"
                  : "rounded-full border border-[#C4A35A] px-5 py-2 text-sm font-medium text-[#1A1A2E] transition-all duration-200 hover:bg-[#C4A35A] hover:text-white"
              }
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Grid: 2 rows of 4 on desktop; horizontal scroll acceptable on mobile */}
      <div className="mt-10 grid grid-flow-col auto-cols-[minmax(220px,1fr)] gap-6 overflow-x-auto pb-2 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:overflow-visible md:grid-cols-4">
        {filtered.map((product) => (
          <ProductCard key={product.sku} product={product} />
        ))}
      </div>

      {/* Explore all */}
      <div className="mt-8 flex justify-end">
        <Link
          href="/products"
          className="group inline-flex items-center gap-2 text-sm font-semibold text-navy transition-colors hover:text-gold"
        >
          Explore All Products
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
