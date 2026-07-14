"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Bucket, Product } from "@/lib/types/product";
import { searchProducts, TAG_FILTERS } from "@/lib/catalog";
import { ProductGrid } from "@/components/products/product-grid";
import { CatalogEmptyState } from "@/components/products/empty-state";

interface ProductSearchProps {
  products: Product[];
  buckets: Bucket[];
  initialQuery?: string;
}

/** Interactive catalog: search + collection/tag filters + grid (client island). */
export function ProductSearch({ products, buckets, initialQuery = "" }: ProductSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const [collection, setCollection] = useState<string>("all");
  const [tags, setTags] = useState<string[]>([]);

  // Debounce 300ms + sync ?q= for shareable URLs.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(query);
      const url = new URL(window.location.href);
      if (query) url.searchParams.set("q", query);
      else url.searchParams.delete("q");
      window.history.replaceState(null, "", url.toString());
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function toggleTag(value: string) {
    setTags((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));
  }
  function clearAll() {
    setQuery("");
    setCollection("all");
    setTags([]);
  }

  const filtered = useMemo(() => {
    let list = products;
    if (collection !== "all") list = list.filter((p) => p.bucket === collection);
    if (tags.length > 0) list = list.filter((p) => tags.some((t) => (p.tags ?? []).includes(t)));
    if (debounced.trim()) list = searchProducts(debounced, list);
    return list;
  }, [products, collection, tags, debounced]);

  const filterCount = (collection !== "all" ? 1 : 0) + tags.length + (debounced.trim() ? 1 : 0);
  const grouped = collection === "all" && !debounced.trim() && tags.length === 0;
  // Sub-header grouping: a specific collection is active and the user is not searching.
  const categoryGrouped = collection !== "all" && !debounced.trim();

  // Group filtered products by their `category` field, preserving stable order.
  // Products with no category fall under a "More" group rendered last.
  const categoryGroups = useMemo(() => {
    if (!categoryGrouped) return [] as { name: string; items: Product[] }[];
    const MORE = "More";
    const order: string[] = [];
    const map = new Map<string, Product[]>();
    for (const p of filtered) {
      const key = p.category?.trim() ? p.category : MORE;
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(p);
    }
    // Ensure the "More" group is always last while keeping other groups stable.
    const named = order.filter((k) => k !== MORE);
    const ordered = map.has(MORE) ? [...named, MORE] : named;
    return ordered.map((name) => ({ name, items: map.get(name) ?? [] }));
  }, [categoryGrouped, filtered]);

  return (
    <>
      {/* Sticky filter bar */}
      <div className="sticky top-16 z-30 border-y border-[#EDE9E3] bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-[1200px] space-y-3 px-6 py-4">
          {/* Search input */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#999999]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, tags, collections…"
              aria-label="Search products"
              className="h-12 w-full rounded-xl border border-[#EDE9E3] bg-white pl-11 pr-11 text-sm text-[#333333] focus-visible:border-gold focus-visible:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-[#999999] hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          {/* Collection pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterPill active={collection === "all"} onClick={() => setCollection("all")}>
              All
            </FilterPill>
            {buckets.map((b) => (
              <FilterPill key={b.code} active={collection === b.code} onClick={() => setCollection(b.code)}>
                {b.name}
              </FilterPill>
            ))}
          </div>

          {/* Tag pills */}
          <div className="flex flex-wrap gap-2">
            {TAG_FILTERS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => toggleTag(t.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  tags.includes(t.value)
                    ? "border-gold bg-gold/15 text-navy"
                    : "border-[#EDE9E3] text-[#666666] hover:border-navy"
                }`}
              >
                {t.label}
              </button>
            ))}
            {filterCount > 0 ? (
              <button
                type="button"
                onClick={clearAll}
                className="rounded-full px-3 py-1 text-xs font-semibold text-gold hover:underline"
              >
                Clear all{filterCount > 0 ? ` (${filterCount})` : ""}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Results */}
      <section className="bg-background py-12">
        <div className="mx-auto max-w-[1200px] px-6">
          <p className="mb-6 text-sm text-[#666666]">
            {debounced.trim() ? (
              <>Showing {filtered.length} results for &ldquo;{debounced.trim()}&rdquo;</>
            ) : (
              <>Showing {filtered.length} of {products.length} products</>
            )}
          </p>

          {filtered.length === 0 ? (
            <CatalogEmptyState onClear={clearAll} />
          ) : grouped ? (
            <div className="space-y-14">
              {buckets.map((b) => {
                const items = filtered.filter((p) => p.bucket === b.code);
                if (items.length === 0) return null;
                return (
                  <div key={b.code}>
                    <div className="mb-6 flex items-baseline gap-3">
                      <h2 className="text-2xl font-bold text-[#1A1A1A]">{b.name}</h2>
                      <span className="font-numbers text-sm text-[#999999]">
                        {items.length} {items.length === 1 ? "product" : "products"}
                      </span>
                    </div>
                    <ProductGrid products={items} />
                  </div>
                );
              })}
            </div>
          ) : categoryGrouped ? (
            <div>
              {categoryGroups.map((g) => (
                <div key={g.name}>
                  <h3 className="mb-4 mt-8 border-l-4 border-[#C4A35A] pl-3 text-lg font-semibold text-[#1A1A2E]">
                    {g.name}
                  </h3>
                  <ProductGrid products={g.items} />
                </div>
              ))}
            </div>
          ) : (
            <ProductGrid products={filtered} />
          )}
        </div>
      </section>
    </>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? "border-navy bg-navy text-white" : "border-[#EDE9E3] bg-white text-navy hover:border-navy"
      }`}
    >
      {children}
    </button>
  );
}
