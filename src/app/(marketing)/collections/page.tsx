import type { Metadata } from "next";
import { buildMetadata } from "@/lib/utils/seo";
import { BUCKETS, getCollectionProductCount } from "@/lib/catalog";
import { Reveal } from "@/components/marketing/reveal";
import { CollectionGrid } from "@/components/collections/collection-grid";

const SITE_URL = "https://neonvisuals.in";

export const metadata: Metadata = buildMetadata({
  title: "Corporate Gift Collections - 11 Curated Categories | Neon Visuals",
  description:
    "Explore our 11 corporate gifting collections: Onboarding, Milestone, CEO Recognition, Festive, Client Appreciation, Experience Kits, Tech-Forward, Sustainability, Events, College, and Visiting Cards.",
  path: "/collections",
});

export default function CollectionsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Corporate Gift Collections",
    url: `${SITE_URL}/collections`,
    hasPart: {
      "@type": "ItemList",
      numberOfItems: BUCKETS.length,
      itemListElement: BUCKETS.map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: b.name,
        url: `${SITE_URL}/collections/${b.slug}`,
      })),
    },
  };

  const totalProducts = BUCKETS.reduce(
    (sum, b) => sum + getCollectionProductCount(b.code),
    0,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* HERO - compact */}
      <section className="bg-linear-to-br from-navy to-[#2a2a4a]">
        <div className="mx-auto max-w-[1200px] px-6 py-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[13px] font-medium text-cream">
            <span className="text-gold">✦</span> 11 Curated Collections
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-[#FAFAF8] sm:text-5xl">
            Every Moment Deserves Its Own Collection
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-[1.7] text-[#9CA3AF]">
            From Day 1 onboarding to 20-year milestones - we&apos;ve designed a
            collection for every moment that matters in your team&apos;s journey.
          </p>
        </div>
      </section>

      <section className="bg-background py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <p className="mb-8 text-sm text-[#666666]">
              {BUCKETS.length} collections · {totalProducts} products
            </p>
          </Reveal>
          <CollectionGrid collections={BUCKETS} />
        </div>
      </section>
    </>
  );
}
