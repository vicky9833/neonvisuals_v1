import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Phone, Mail, MessageCircle } from "lucide-react";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/utils/seo";
import {
  PRODUCTS,
  getProductBySlug,
  getBucketByCode,
  getRelatedBuckets,
  waProduct,
} from "@/lib/catalog";
import type { Product } from "@/lib/types/product";
import { Reveal } from "@/components/marketing/reveal";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { ProductGallery } from "@/components/products/product-gallery";
import { ProductGrid } from "@/components/products/product-grid";
import { CollectionGrid } from "@/components/collections/collection-grid";
import { EnquiryCTA } from "@/components/shared/enquiry-cta";
import { StickyMobileCTA } from "@/components/shared/sticky-mobile-cta";
import { ErrorBoundary } from "@/components/shared/error-boundary";

const SITE_URL = "https://neonvisuals.in";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return buildMetadata({ title: "Product", description: "" });
  const desc = `${product.tagline ? `${product.tagline}. ` : ""}${product.description.slice(0, 120)}. Enquire for pricing and customisation.`;
  return buildMetadata({
    title: `${product.name} - Personalised Corporate Gift | Neon Visuals`,
    description: desc,
    path: `/products/${product.slug}`,
    image: product.imageUrl,
  });
}

const PERSONALISATION: Record<string, string> = {
  laser_engrave: "🔥 Laser Engraved",
  print: "�-�️ Custom Print",
  emboss: "🪶 Embossed",
  deboss: "🪧 Debossed",
  sublimation: "🌈 Sublimation Print",
  dtf: "👕 DTF Print",
  embroidery: "🧵 Embroidered",
  uv_print: "✨ UV Print",
};

const PACKAGING: Record<string, string> = {
  budget: "Budget Packaging - Clean branded sleeve, tissue wrap.",
  standard: "Standard Packaging - Rigid box with branded inner.",
  premium: "Premium Packaging - Rigid box, magnetic flap, foil stamping, branded inner lid.",
  flagship: "Flagship Packaging - Fabric-wrapped keepsake box, wax seal, narrative card.",
};

function prettify(token: string): string {
  return token.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Deterministic Fisher-Yates shuffle seeded by a string (the product SKU).
 * Uses an xmur3 hash to derive a 32-bit state, then a mulberry32 PRNG. Output
 * is stable per seed (safe for static generation) but varies across products,
 * so the "You May Also Like" grid isn't identical on every page.
 */
function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  const rand = (): number => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Build up to `count` "You May Also Like" products locally (no catalog.ts
 * changes): prefer the same collection, then fill from the same category.
 * Selection is deduped by SKU and shuffled deterministically per SKU.
 */
function selectRelatedProducts(product: Product, count = 4): Product[] {
  const picked: Product[] = [];
  const seen = new Set<string>([product.sku]);

  const sameCollection = PRODUCTS.filter(
    (p) => p.bucket === product.bucket && p.sku !== product.sku,
  );
  for (const p of seededShuffle(sameCollection, product.sku)) {
    if (picked.length >= count) break;
    if (!seen.has(p.sku)) {
      seen.add(p.sku);
      picked.push(p);
    }
  }

  if (picked.length < count && product.category !== undefined) {
    const sameCategory = PRODUCTS.filter(
      (p) => p.category === product.category && !seen.has(p.sku),
    );
    for (const p of seededShuffle(sameCategory, product.sku)) {
      if (picked.length >= count) break;
      seen.add(p.sku);
      picked.push(p);
    }
  }

  return picked;
}

export default async function ProductDetailPage({ params }: Params) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const collection = getBucketByCode(product.bucket);
  const collectionName = collection?.name ?? "Neon Visuals";
  const wa = waProduct(product, collectionName);
  const related = selectRelatedProducts(product, 4);
  const relatedCollections = getRelatedBuckets(product.bucket, 3);

  const deskTest = (product.tags ?? []).includes("desk-test");
  const personalisations = (product.personalizationTypes ?? [])
    .map((t) => PERSONALISATION[t])
    .filter(Boolean);
  const displayTags = (product.tags ?? []).filter((t) => !t.includes(":"));
  const occasions = (product.occasions ?? []).map(prettify);
  const archetypes = (product.archetypes ?? []).map(prettify);

  const jsonLd: Record<string, unknown>[] = [
    breadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Collections", url: "/collections" },
      { name: collectionName, url: collection ? `/collections/${collection.slug}` : "/collections" },
      { name: product.name, url: `/products/${product.slug}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description,
      sku: product.sku,
      image: product.imageUrl ? [product.imageUrl] : undefined,
      brand: { "@type": "Brand", name: "Neon Visuals" },
      url: `${SITE_URL}/products/${product.slug}`,
      offers: {
        "@type": "Offer",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/products/${product.slug}`,
      },
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <ErrorBoundary>
      <div className="mx-auto max-w-[1200px] px-6 py-10 pb-28 md:pb-10">
        <Breadcrumb
          items={[
            { name: "Home", href: "/" },
            { name: "Collections", href: "/collections" },
            { name: collectionName, href: collection ? `/collections/${collection.slug}` : "/collections" },
            { name: product.name },
          ]}
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-[55fr_45fr]">
          {/* LEFT - gallery */}
          <ErrorBoundary>
            <ProductGallery
              name={product.name}
              imageUrl={product.imageUrl}
              galleryImages={product.galleryImages}
            />
          </ErrorBoundary>

          {/* RIGHT - info */}
          <div>
            {collection ? (
              <Link
                href={`/collections/${collection.slug}`}
                className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-navy transition-colors hover:bg-secondary/70"
              >
                {collection.name}
              </Link>
            ) : null}
            <h1 className="mt-3 text-3xl font-bold text-navy">{product.name}</h1>
            {product.tagline ? (
              <p className="mt-2 text-lg italic text-[#666666]">{product.tagline}</p>
            ) : null}

            <div className="my-5 border-t border-[#EDE9E3]" />

            <p className="text-base leading-[1.8] text-[#333333]">
              {product.description}
            </p>

            {/* What makes it special */}
            <div className="mt-6 space-y-4">
              {personalisations.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {personalisations.map((p) => (
                    <span
                      key={p}
                      className="rounded-lg border border-[#EDE9E3] bg-secondary/50 px-3 py-1.5 text-sm text-[#444444]"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              ) : null}

              {deskTest ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-[#2D6A4F]/10 px-3 py-1.5 text-sm font-medium text-[#2D6A4F]">
                  <CheckCircle2 className="size-4" /> Passes the 3-Year Desk Test
                </span>
              ) : null}

              {product.recommendedPackaging ? (
                <p className="text-sm text-[#555555]">
                  <span className="font-semibold text-[#1A1A1A]">Packaging: </span>
                  {PACKAGING[product.recommendedPackaging]}
                </p>
              ) : null}

              {typeof product.wowScore === "number" ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#1A1A1A]">Wow factor:</span>
                  <span className="flex gap-1" aria-label={`${product.wowScore} out of 10`}>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <span
                        key={i}
                        className={`size-2 rounded-full ${i < (product.wowScore ?? 0) ? "bg-gold" : "bg-[#EDE9E3]"}`}
                      />
                    ))}
                  </span>
                  <span className="font-numbers text-sm text-[#666666]">{product.wowScore}/10</span>
                </div>
              ) : null}
            </div>

            {displayTags.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {displayTags.map((t) => (
                  <span key={t} className="rounded-full border border-[#EDE9E3] px-2.5 py-0.5 text-xs text-[#777777]">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="my-6 border-t border-[#EDE9E3]" />

            {/* CTA */}
            <EnquiryCTA product={product} collectionName={collectionName} />
            <Link
              href="/gift-builder"
              className="mt-3 inline-block text-sm font-semibold text-gold hover:underline"
            >
              Add to a Custom Kit →
            </Link>

            {/* Perfect for */}
            {(occasions.length > 0 || archetypes.length > 0) ? (
              <div className="mt-8 space-y-3">
                {occasions.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-semibold text-[#1A1A1A]">Perfect For</h3>
                    <p className="mt-1 text-sm text-[#666666]">{occasions.join(" · ")}</p>
                  </div>
                ) : null}
                {archetypes.length > 0 ? (
                  <p className="text-sm text-[#666666]">
                    <span className="font-semibold text-[#1A1A1A]">Best for: </span>
                    {archetypes.join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* HOW PERSONALISATION WORKS */}
        <section className="mt-16">
          <Reveal>
            <h2 className="text-center text-2xl font-bold text-[#1A1A1A]">
              How Personalisation Works
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { n: "1", t: "Share your team list", d: "Send us names and the occasion - one WhatsApp message is enough." },
              { n: "2", t: "We personalise each gift", d: "Names, messages, and packaging - handled by our personalisation artists." },
              { n: "3", t: "Delivered to your doorstep", d: "QC'd, photo-proofed, and delivered with intention." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 80}>
                <div className="rounded-2xl border border-[#EDE9E3] bg-white p-7 text-center shadow-sm">
                  <span className="font-numbers text-3xl font-bold text-gold">{s.n}</span>
                  <h3 className="mt-3 text-base font-bold text-[#1A1A1A]">{s.t}</h3>
                  <p className="mt-2 text-sm text-[#666666]">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* YOU MAY ALSO LIKE */}
        {related.length > 0 ? (
          <section className="mt-14">
            <Reveal>
              <h2 className="text-2xl font-bold text-[#1A1A1A]">You May Also Like</h2>
              <p className="mb-8 mt-1 text-sm text-[#666666]">More from this collection.</p>
            </Reveal>
            <ProductGrid products={related} />
          </section>
        ) : null}

        {/* EXPLORE MORE COLLECTIONS */}
        {relatedCollections.length > 0 ? (
          <section className="mt-14">
            <Reveal>
              <h2 className="mb-8 text-2xl font-bold text-[#1A1A1A]">Explore More Collections</h2>
            </Reveal>
            <CollectionGrid collections={relatedCollections} />
          </section>
        ) : null}
      </div>
      </ErrorBoundary>

      {/* CTA BANNER */}
      <section className="bg-linear-to-r from-navy to-[#2a2a4a] py-16">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-6 px-6 text-center">
          <p className="max-w-2xl text-xl font-semibold text-[#FAFAF8]">
            Not sure which gift is right? Tell us about your team and we&apos;ll
            recommend the perfect match.
          </p>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-13 items-center gap-2 rounded-full bg-[#25D366] px-8 text-[15px] font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:brightness-110"
          >
            <MessageCircle className="size-4" /> Get Personalised Recommendations →
          </a>
        </div>
      </section>

      <StickyMobileCTA href={wa} />
    </>
  );
}
