/**
 * CollectionGrid - responsive grid (2/3/4 cols) with staggered scroll-reveal.
 */
import type { Bucket } from "@/lib/types/product";
import { Reveal } from "@/components/marketing/reveal";
import { CollectionCard } from "@/components/collections/collection-card";

export function CollectionGrid({ collections }: { collections: readonly Bucket[] }) {
  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
      {collections.map((collection, i) => (
        <Reveal key={collection.code} delay={(i % 8) * 50}>
          <CollectionCard collection={collection} />
        </Reveal>
      ))}
    </div>
  );
}
