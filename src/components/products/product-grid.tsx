/**
 * ProductGrid — responsive grid (1/2/3/4 cols) with staggered scroll-reveal.
 * Server-rendered; uses the Reveal client island per card for entrance.
 */
import type { Product } from "@/lib/types/product";
import { Reveal } from "@/components/marketing/reveal";
import { ProductCard } from "@/components/products/product-card";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, i) => (
        <Reveal key={product.sku} delay={(i % 8) * 50}>
          <ProductCard product={product} />
        </Reveal>
      ))}
    </div>
  );
}
