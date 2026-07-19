import Image from "next/image";
import Link from "next/link";
import { Plus, Check, Star } from "lucide-react";
import type { Product } from "@/lib/types/product";
import { getBucketByCode } from "@/lib/catalog";
import { PlaceholderImage } from "@/components/products/placeholder-image";
import { variantUrl, originalOnError } from "@/lib/utils/image-variants";

export function CompactProductCard({
  product,
  added,
  recommended,
  onToggle,
}: {
  product: Product;
  added: boolean;
  recommended?: boolean;
  onToggle: () => void;
}) {
  const collection = getBucketByCode(product.bucket);
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[#EDE9E3] bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-square overflow-hidden rounded-t-2xl border-b border-[#EDE9E3] bg-[#FAFAF8]">
        {product.imageUrl ? (
          <Image
            src={variantUrl(product.imageUrl, "card")}
            alt={product.name}
            fill
            unoptimized
            onError={originalOnError(product.imageUrl)}
            className="object-contain p-3"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <PlaceholderImage name={product.name} />
        )}
        {recommended ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold text-navy">
            <Star className="size-3" /> Recommended
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-[#1A1A1A]">{product.name}</h3>
        {product.tagline ? (
          <p className="line-clamp-1 text-xs text-[#888888]">{product.tagline}</p>
        ) : null}
        {collection ? (
          <span className="mt-1 w-fit rounded-full bg-secondary px-2 py-0.5 text-[10px] text-navy">
            {collection.name}
          </span>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={added}
            className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
              added ? "bg-navy text-white" : "bg-gold text-navy hover:brightness-105"
            }`}
          >
            {added ? (
              <>
                <Check className="size-3.5" /> Added
              </>
            ) : (
              <>
                <Plus className="size-3.5" /> Add to Kit
              </>
            )}
          </button>
          <Link
            href={`/products/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs font-medium text-[#888888] hover:text-navy hover:underline"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
