import type { Metadata } from "next";
import { buildMetadata } from "@/lib/utils/seo";
import { PRODUCTS, BUCKETS } from "@/lib/catalog";
import { ProductSearch } from "@/components/search/product-search";

const SITE_URL = "https://neonvisuals.in";

export const metadata: Metadata = buildMetadata({
  title: "Premium Corporate Gifts - Personalised for Your Team | Neon Visuals",
  description:
    "Explore 120+ personalised corporate gifts across 11 collections. From onboarding kits to CEO recognition - every gift carries the recipient's name. Enquire now.",
  path: "/products",
  image: "/og/catalog.png",
});

type SearchParams = { searchParams: Promise<{ q?: string }> };

export default async function ProductsPage({ searchParams }: SearchParams) {
  const { q } = await searchParams;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Neon Visuals Corporate Gift Catalogue",
    numberOfItems: PRODUCTS.length,
    itemListElement: PRODUCTS.slice(0, 10).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.name,
      url: `${SITE_URL}/products/${p.slug}`,
    })),
  };

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
            <span className="text-gold">✦</span> 120+ Curated Products
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-[#FAFAF8] sm:text-5xl">
            Gifts That Stay on Their Desk for Years
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-[1.7] text-[#9CA3AF]">
            Browse premium personalized gifts for corporates, colleges, events,
            startups, and institutions. Every product can be customized with
            your branding, recipient names, and premium packaging.
          </p>
        </div>
      </section>

      <ProductSearch
        products={PRODUCTS}
        buckets={[...BUCKETS]}
        initialQuery={q ?? ""}
      />
    </>
  );
}
