"use client";

import Image from "next/image";
import { X } from "lucide-react";
import type { Product } from "@/lib/types/product";
import { getBucketByCode } from "@/lib/catalog";

/** Shared kit contents list (used by desktop sidebar + mobile drawer). */
export function KitContents({
  products,
  onRemove,
}: {
  products: Product[];
  onRemove: (sku: string) => void;
}) {
  if (products.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#EDE9E3] bg-secondary/40 p-5 text-center text-sm text-[#888888]">
        Your kit is empty. Add 3-7 items for the perfect experience.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {products.map((p) => {
        const collection = getBucketByCode(p.bucket);
        return (
          <li
            key={p.sku}
            className="flex items-center gap-3 rounded-xl border border-[#EDE9E3] bg-white p-2"
          >
            <span className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-[#EDE9E3] bg-[#FAFAF8]">
              {p.imageUrl ? (
                <Image src={p.imageUrl} alt="" fill unoptimized className="object-contain" sizes="48px" />
              ) : (
                <span className="flex size-full items-center justify-center bg-navy text-[10px] font-bold text-gold">
                  NV
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[#1A1A1A]">{p.name}</span>
              <span className="block truncate text-xs text-[#888888]">{collection?.name}</span>
            </span>
            <button
              type="button"
              onClick={() => onRemove(p.sku)}
              aria-label={`Remove ${p.name}`}
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-[#999999] transition-colors hover:bg-secondary hover:text-destructive"
            >
              <X className="size-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Desktop sticky sidebar. */
export function KitSidebar({
  products,
  onRemove,
  onContinue,
}: {
  products: Product[];
  onRemove: (sku: string) => void;
  onContinue: () => void;
}) {
  return (
    <aside
      id="kit-sidebar"
      className="sticky top-24 hidden h-fit rounded-2xl border border-[#EDE9E3] bg-white p-5 shadow-sm lg:block"
    >
      <h3 className="text-lg font-bold text-[#1A1A1A]">Your Experience Kit</h3>
      <p className="mt-1 text-xs text-[#888888]">We recommend 3-7 items for the perfect kit</p>
      <div className="mt-4">
        <KitContents products={products} onRemove={onRemove} />
      </div>
      <p className="mt-4 font-numbers text-sm font-medium text-navy">
        {products.length} {products.length === 1 ? "item" : "items"} in your kit
      </p>
      <button
        type="button"
        disabled={products.length === 0}
        onClick={onContinue}
        className="mt-3 w-full rounded-xl bg-navy py-3 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue to Packaging →
      </button>
    </aside>
  );
}
