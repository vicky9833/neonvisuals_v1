/**
 * CollectionCard - reusable collection card (collections directory + related).
 * Entire card links to the collection page. NO prices.
 */
import Link from "next/link";
import type { Bucket } from "@/lib/types/product";
import { getCollectionProductCount } from "@/lib/catalog";
import { CollectionIcon } from "@/components/collections/collection-icon";

export function CollectionCard({ collection }: { collection: Bucket }) {
  const count = getCollectionProductCount(collection.code);
  return (
    <Link
      href={`/collections/${collection.slug}`}
      className="group flex min-h-[280px] flex-col items-center rounded-2xl border border-[#EDE9E3] bg-white p-7 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md focus-visible:-translate-y-1"
    >
      <div className="relative">
        <span className="flex size-20 items-center justify-center rounded-full bg-secondary">
          <CollectionIcon name={collection.icon} className="size-9 text-navy" />
        </span>
        <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-navy">
          {collection.code}
        </span>
      </div>
      <h3 className="mt-5 text-xl font-bold text-[#1A1A1A]">{collection.name}</h3>
      {collection.purpose ? (
        <p className="mt-2 line-clamp-2 text-sm text-[#666666]">
          {collection.purpose}
        </p>
      ) : null}
      <span className="font-numbers mt-3 text-sm text-[#999999]">
        {count} {count === 1 ? "Product" : "Products"}
      </span>
      <span className="mt-auto pt-5 text-sm font-semibold text-gold transition-transform duration-200 group-hover:translate-x-1">
        Explore Collection →
      </span>
    </Link>
  );
}
