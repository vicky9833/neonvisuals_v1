"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { PRODUCTS, getBucketByCode, searchProducts } from "@/lib/catalog";
import { variantUrl, originalOnError } from "@/lib/utils/image-variants";

/** Global header search: icon trigger + full-width overlay with live results. */
export function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    // Reset the query when the overlay closes (intentional state sync on an external trigger).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) setQuery("");
  }, [open]);

  const results = query.trim() ? searchProducts(query) : [];
  const shown = results.slice(0, 8);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search products"
        className="hidden size-10 items-center justify-center rounded-full text-[#555555] transition-colors hover:bg-secondary hover:text-navy md:flex"
      >
        <Search className="size-5" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-60 flex justify-center bg-navy/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="mt-20 h-fit w-full max-w-2xl overflow-hidden rounded-2xl border border-[#EDE9E3] bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative border-b border-[#EDE9E3]">
              <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-[#999999]" />
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search 290+ products…"
                aria-label="Search products"
                className="h-16 w-full bg-transparent pl-12 pr-12 text-base text-[#333333] focus-visible:outline-none"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close search"
                className="absolute right-4 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-[#999999] hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>

            {query.trim() ? (
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {shown.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-[#888888]">
                    No products match &ldquo;{query.trim()}&rdquo;.
                  </p>
                ) : (
                  <>
                    {shown.map((p) => {
                      const collection = getBucketByCode(p.bucket);
                      return (
                        <button
                          key={p.sku}
                          type="button"
                          onClick={() => go(`/products/${p.slug}`)}
                          className="flex w-full items-center gap-4 rounded-xl p-2 text-left transition-colors hover:bg-secondary"
                        >
                          <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
                            {p.imageUrl ? (
                              <Image src={variantUrl(p.imageUrl, "thumb")} alt="" fill unoptimized onError={originalOnError(p.imageUrl)} className="object-cover" sizes="48px" />
                            ) : (
                              <span className="flex size-full items-center justify-center bg-navy text-[10px] font-bold text-gold">
                                NV
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-[#1A1A1A]">
                              {p.name}
                            </span>
                            <span className="block truncate text-xs text-[#888888]">
                              {collection?.name}
                            </span>
                          </span>
                          <span className="text-xs font-semibold text-gold">View →</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => go(`/products?q=${encodeURIComponent(query.trim())}`)}
                      className="mt-1 w-full rounded-xl bg-secondary py-3 text-center text-sm font-semibold text-navy transition-colors hover:bg-secondary/70"
                    >
                      View all {results.length} results →
                    </button>
                  </>
                )}
              </div>
            ) : (
              <p className="px-5 py-8 text-sm text-[#888888]">
                Start typing to search across all 290+ products.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
