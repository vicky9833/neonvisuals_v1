/**
 * FeaturedProducts - featured product grid for the homepage "Gifts Worth
 * Keeping" section. No prices: each card drives to the product detail page /
 * enquiry. (P-fixpass #1: the All/Bottles category-filter pills were removed;
 * the grid now renders every passed product. The static FEATURED source in the
 * homepage is unchanged.)
 */
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/lib/types/product";
import { ProductCard } from "@/components/products/product-card";

export function FeaturedProducts({ products }: { products: Product[] }) {
  return (
    <div>
      {/* Grid: 2 rows of 4 on desktop; horizontal scroll acceptable on mobile */}
      <div className="grid grid-flow-col auto-cols-[minmax(220px,1fr)] gap-6 overflow-x-auto pb-2 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:overflow-visible md:grid-cols-4">
        {products.map((product) => (
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
