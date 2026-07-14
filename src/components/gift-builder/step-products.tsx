"use client";

import { type Dispatch, useMemo, useState } from "react";
import { Search, X, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import type { Bucket, Product } from "@/lib/types/product";
import { PRODUCTS, searchProducts } from "@/lib/catalog";
import {
  getOccasion,
  getRecommendedProducts,
  isRecommended,
  type KitAction,
  type KitBuilderState,
} from "@/lib/gift-builder";
import { CompactProductCard } from "@/components/gift-builder/compact-product-card";
import { KitContents } from "@/components/gift-builder/kit-sidebar";

export function StepProducts({
  state,
  dispatch,
  buckets,
  onContinue,
}: {
  state: KitBuilderState;
  dispatch: Dispatch<KitAction>;
  buckets: Bucket[];
  onContinue: () => void;
}) {
  const occasion = getOccasion(state.occasion);
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<string>(occasion?.bucket ?? "all");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const recommended = useMemo(
    () => getRecommendedProducts(state.occasion),
    [state.occasion],
  );

  const orderedBuckets = useMemo(() => {
    if (!occasion?.bucket) return buckets;
    const primary = buckets.filter((b) => b.code === occasion.bucket);
    const rest = buckets.filter((b) => b.code !== occasion.bucket);
    return [...primary, ...rest];
  }, [buckets, occasion]);

  const filtered = useMemo(() => {
    let list = PRODUCTS;
    if (collection !== "all") list = list.filter((p) => p.bucket === collection);
    if (query.trim()) list = searchProducts(query, list);
    return list;
  }, [collection, query]);

  const inKit = (sku: string) => state.selectedProducts.some((p) => p.sku === sku);
  const toggle = (product: Product) => {
    const wasInKit = inKit(product.sku);
    dispatch({ type: "TOGGLE_PRODUCT", product });
    if (!wasInKit) {
      toast(`✓ ${product.name} added to your kit`, {
        duration: 2000,
        action: {
          label: "View Kit →",
          onClick: () => {
            if (
              typeof window !== "undefined" &&
              window.matchMedia("(min-width: 1024px)").matches
            ) {
              document
                .getElementById("kit-sidebar")
                ?.scrollIntoView({ behavior: "smooth" });
            } else {
              setDrawerOpen(true);
            }
          },
        },
      });
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A]">Select Your Products</h2>
      <p className="mt-2 text-[#666666]">
        Add products to your kit. We recommend 3-7 items for the perfect experience.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Browse area */}
        <div>
          {/* Recommended row */}
          {recommended.length > 0 ? (
            <div className="mb-8">
              <h3 className="mb-3 text-sm font-semibold text-[#1A1A1A]">
                Recommended for {occasion?.label ?? "You"}
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {recommended.map((p) => (
                  <div key={p.sku} className="w-[180px] shrink-0">
                    <CompactProductCard
                      product={p}
                      added={inKit(p.sku)}
                      recommended
                      onToggle={() => toggle(p)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Search + collection filter */}
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#999999]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="h-11 w-full rounded-xl border border-[#EDE9E3] bg-white pl-11 pr-4 text-sm focus-visible:border-gold focus-visible:outline-none"
            />
          </div>
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
            {orderedBuckets.map((b) => (
              <button
                key={b.code}
                type="button"
                onClick={() => setCollection(b.code)}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  collection === b.code
                    ? "border-navy bg-navy text-white"
                    : "border-[#EDE9E3] bg-white text-navy hover:border-navy"
                }`}
              >
                {b.name}
                {occasion?.bucket === b.code ? " ★" : ""}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCollection("all")}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                collection === "all"
                  ? "border-navy bg-navy text-white"
                  : "border-[#EDE9E3] bg-white text-navy hover:border-navy"
              }`}
            >
              All Collections
            </button>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#EDE9E3] bg-secondary/40 p-10 text-center text-sm text-[#888888]">
              No products match your search.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {filtered.map((p) => (
                <CompactProductCard
                  key={p.sku}
                  product={p}
                  added={inKit(p.sku)}
                  recommended={isRecommended(state.occasion, p.sku)}
                  onToggle={() => toggle(p)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Desktop sidebar */}
        <aside
          id="kit-sidebar"
          className="sticky top-24 hidden h-fit rounded-2xl border border-[#EDE9E3] bg-white p-5 shadow-sm lg:block"
        >
          <h3 className="text-lg font-bold text-[#1A1A1A]">Your Experience Kit</h3>
          <p className="mt-1 text-xs text-[#888888]">We recommend 3-7 items for the perfect kit</p>
          <div className="mt-4 max-h-[50vh] overflow-y-auto">
            <KitContents
              products={state.selectedProducts}
              onRemove={(sku) => dispatch({ type: "REMOVE_PRODUCT", sku })}
            />
          </div>
          <p className="mt-4 font-numbers text-sm font-medium text-navy">
            {state.selectedProducts.length}{" "}
            {state.selectedProducts.length === 1 ? "item" : "items"} in your kit
          </p>
          <button
            type="button"
            disabled={state.selectedProducts.length === 0}
            onClick={onContinue}
            className="mt-3 w-full rounded-xl bg-navy py-3 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue to Packaging →
          </button>
        </aside>
      </div>

      {/* Mobile floating pill */}
      {state.selectedProducts.length > 0 ? (
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-center gap-2 rounded-full bg-navy py-3.5 text-sm font-semibold text-white shadow-lg lg:hidden"
        >
          <ShoppingBag className="size-4" />
          {state.selectedProducts.length} items selected - Review kit
        </button>
      ) : null}

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-navy/40 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-background p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1A1A1A]">Your Experience Kit</h3>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-full text-[#999999] hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>
            <KitContents
              products={state.selectedProducts}
              onRemove={(sku) => dispatch({ type: "REMOVE_PRODUCT", sku })}
            />
            <button
              type="button"
              disabled={state.selectedProducts.length === 0}
              onClick={() => {
                setDrawerOpen(false);
                onContinue();
              }}
              className="mt-4 w-full rounded-xl bg-navy py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              Continue to Packaging →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
