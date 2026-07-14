/**
 * Catalog empty state - shown when search/filters return zero products.
 */
import { SearchX } from "lucide-react";

export function CatalogEmptyState({ onClear }: { onClear?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#EDE9E3] bg-secondary/40 px-6 py-20 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-navy text-gold">
        <SearchX className="size-7" />
      </span>
      <h3 className="mt-6 text-xl font-bold text-[#1A1A1A]">
        No products match your search
      </h3>
      <p className="mt-2 max-w-md text-sm text-[#666666]">
        Try different keywords or clear your filters to explore the full
        collection.
      </p>
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-6 inline-flex h-11 items-center rounded-full bg-navy px-6 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
