/**
 * ProductCard - reusable, server-rendered product card (catalog, collection,
 * related, homepage, occasions). Entire card links to the product detail page.
 * NO prices anywhere - the CTA drives to the detail page / enquiry.
 */
import Link from "next/link";
import type { Product } from "@/lib/types/product";
import { getBucketByCode } from "@/lib/catalog";
import { ProductCardImage } from "@/components/products/product-card-image";

export function ProductCard({ product }: { product: Product }) {
  const collection = getBucketByCode(product.bucket);
  const tags = (product.tags ?? []).filter((t) => !t.includes(":")).slice(0, 3);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#EDE9E3] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md focus-visible:-translate-y-1 focus-visible:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden rounded-lg border border-[#EDE9E3] bg-[#FAFAF8]">
        <ProductCardImage imageUrl={product.imageUrl} name={product.name} />
        {collection ? (
          <span className="absolute left-3 top-3 rounded-full bg-navy/80 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            {collection.name}
          </span>
        ) : null}
        {(product.galleryImages?.length ?? 0) > 1 ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-[#1A1A2E]/80 px-2 py-0.5 text-xs text-white">
            {product.galleryImages!.length} {product.galleryImages!.length === 1 ? "variant" : "variants"}
          </span>
        ) : null}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-1 text-lg font-semibold text-[#1A1A1A]">
          {product.name}
        </h3>
        {product.tagline ? (
          <p className="mt-1 line-clamp-2 text-sm italic text-[#666666]">
            {product.tagline}
          </p>
        ) : null}

        {tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5 overflow-hidden">
            {tags.map((tag) => (
              <span
                key={tag}
                className={
                  tag === "Best Seller"
                    ? "rounded-full bg-[#C4A35A] px-2 py-0.5 text-xs font-medium text-white"
                    : "rounded-full border border-[#C4A35A] bg-transparent px-2 py-0.5 text-xs text-[#1A1A2E]"
                }
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <span className="mt-auto pt-4 text-sm font-medium text-gold transition-colors group-hover:underline">
          Enquire →
        </span>
      </div>
    </Link>
  );
}
