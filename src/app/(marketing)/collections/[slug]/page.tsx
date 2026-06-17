import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Users, CalendarHeart, Sparkles } from "lucide-react";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/utils/seo";
import {
  BUCKETS,
  getBucketBySlug,
  getProductsByCode,
  getRelatedBuckets,
  waCollection,
} from "@/lib/catalog";
import { Reveal } from "@/components/marketing/reveal";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { CollectionIcon } from "@/components/collections/collection-icon";
import { ProductGrid } from "@/components/products/product-grid";
import { CollectionGrid } from "@/components/collections/collection-grid";

const SITE_URL = "https://neonvisuals.in";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BUCKETS.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const bucket = getBucketBySlug(slug);
  if (!bucket) return buildMetadata({ title: "Collection", description: "" });
  const count = getProductsByCode(bucket.code).length;
  return buildMetadata({
    title: `${bucket.name} — Corporate Gifting | Neon Visuals`,
    description: `${bucket.description ?? bucket.purpose}. Explore ${count} personalised products. Enquire now.`,
    path: `/collections/${bucket.slug}`,
  });
}

function prettify(token: string): string {
  return token
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function CollectionPage({ params }: Params) {
  const { slug } = await params;
  const bucket = getBucketBySlug(slug);
  if (!bucket) notFound();

  const products = getProductsByCode(bucket.code);
  const related = getRelatedBuckets(bucket.code, 3);
  const wa = waCollection(bucket.name);

  const occasions = Array.from(
    new Set(products.flatMap((p) => p.occasions ?? [])),
  )
    .slice(0, 4)
    .map(prettify);

  const jsonLd: Record<string, unknown>[] = [
    breadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Collections", url: "/collections" },
      { name: bucket.name, url: `/collections/${bucket.slug}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${bucket.name} — Products`,
      numberOfItems: products.length,
      itemListElement: products.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: p.name,
          description: p.tagline ?? p.description,
          url: `${SITE_URL}/products/${p.slug}`,
          brand: { "@type": "Brand", name: "Neon Visuals" },
        },
      })),
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* HERO */}
      <section className="bg-linear-to-br from-navy to-[#2a2a4a]">
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="[&_a]:text-cream/70 [&_a:hover]:text-gold [&_span]:text-cream">
            <Breadcrumb
              items={[
                { name: "Home", href: "/" },
                { name: "Collections", href: "/collections" },
                { name: bucket.name },
              ]}
            />
          </div>
          <div className="mt-8 max-w-3xl">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-white/5 text-gold">
              <CollectionIcon name={bucket.icon} className="size-8" />
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#FAFAF8] sm:text-5xl">
              {bucket.name}
            </h1>
            <p className="mt-5 text-lg leading-[1.7] text-[#9CA3AF]">
              {bucket.description ?? bucket.purpose}
            </p>
            <span className="mt-6 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-medium text-cream">
              {products.length} Products in this Collection
            </span>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-13 items-center gap-2 rounded-full bg-[#25D366] px-8 text-[15px] font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:brightness-110"
              >
                <MessageCircle className="size-4" /> Enquire About This Collection
              </a>
              <a
                href={waCollection(`${bucket.name} (PDF catalog request)`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-13 items-center rounded-full border-2 border-white/25 px-7 text-[15px] font-semibold text-cream transition-colors hover:bg-white/10"
              >
                Download Catalog
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* WHY THIS COLLECTION */}
      <section className="bg-background py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Reveal>
              <WhyCard
                icon={<Users className="size-6" />}
                title="Who It's For"
                body={bucket.primaryBuyer}
              />
            </Reveal>
            <Reveal delay={80}>
              <WhyCard
                icon={<CalendarHeart className="size-6" />}
                title="When to Gift"
                body={occasions.length > 0 ? occasions.join(" · ") : bucket.purpose}
              />
            </Reveal>
            <Reveal delay={160}>
              <WhyCard
                icon={<Sparkles className="size-6" />}
                title="What Makes It Special"
                body={bucket.description ?? bucket.purpose}
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* PRODUCT GRID */}
      <section className="bg-secondary/40 py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <h2 className="mb-8 text-3xl font-bold tracking-tight text-[#1A1A1A]">
              Products in {bucket.name}
            </h2>
          </Reveal>
          <ProductGrid products={products} />
        </div>
      </section>

      {/* KIT BUILDER BANNER */}
      <section className="bg-background pt-4">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="rounded-2xl border border-gold/30 bg-gold/5 p-6 text-center">
            <p className="text-sm text-[#555555]">
              Want to mix products from different collections?{" "}
              <Link href="/gift-builder" className="font-semibold text-gold hover:underline">
                Try our Kit Builder →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* RELATED COLLECTIONS */}
      {related.length > 0 ? (
        <section className="bg-background py-16">
          <div className="mx-auto max-w-[1200px] px-6">
            <Reveal>
              <h2 className="mb-8 text-3xl font-bold tracking-tight text-[#1A1A1A]">
                You Might Also Like
              </h2>
            </Reveal>
            <CollectionGrid collections={related} />
          </div>
        </section>
      ) : null}

      {/* CTA BANNER */}
      <section className="bg-linear-to-r from-navy to-[#2a2a4a] py-16">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-6 px-6 text-center">
          <p className="max-w-2xl text-xl font-semibold text-[#FAFAF8]">
            Need help choosing from {bucket.name}? Our gifting experts will
            curate the perfect selection for your team.
          </p>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-13 items-center gap-2 rounded-full bg-[#25D366] px-8 text-[15px] font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:brightness-110"
          >
            <MessageCircle className="size-4" /> Chat on WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}

function WhyCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="h-full rounded-2xl border border-[#EDE9E3] bg-white p-7 shadow-sm">
      <span className="flex size-12 items-center justify-center rounded-xl bg-navy text-gold">
        {icon}
      </span>
      <h3 className="mt-5 text-lg font-bold text-[#1A1A1A]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#666666]">{body}</p>
    </div>
  );
}
