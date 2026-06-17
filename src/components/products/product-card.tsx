/**
 * ProductCard — reusable, server-rendered product card (catalog, collection,
 * related, homepage, occasions). Entire card links to the product detail page.
 * NO prices anywhere — the CTA drives to the detail page / enquiry.
 */
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types/product";
import { getBucketByCode } from "@/lib/catalog";
import { PlaceholderImage } from "@/components/products/placeholder-image";

export function ProductCard({ product }: { product: Product }) {
  const collection = getBucketByCode(product.bucket);
  const tags = (product.tags ?? []).filter((t) => !t.includes(":")).slice(0, 3);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#EDE9E3] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md focus-visible:-translate-y-1 focus-visible:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-3/4 overflow-hidden rounded-t-2xl bg-secondary">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={`${product.name} — personalised corporate gift`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <PlaceholderImage name={product.name} />
        )}
        {collection ? (
          <span className="absolute left-3 top-3 rounded-full bg-navy/80 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            {collection.name}
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
                className="rounded-full border border-[#EDE9E3] px-2 py-0.5 text-xs text-[#777777]"
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
