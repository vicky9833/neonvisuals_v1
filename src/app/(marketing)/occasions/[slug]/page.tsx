import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MessageCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/marketing/reveal";
import { OccasionIcon } from "@/components/shared/occasion-icon";
import {
  OCCASIONS,
  getOccasionBySlug,
  relatedOccasions,
} from "@/data/occasions";
import { PRODUCTS } from "@/lib/catalog";
import { ProductCard } from "@/components/products/product-card";
import type { Product } from "@/lib/types/product";
import { buildMetadata, breadcrumbJsonLd, faqJsonLd } from "@/lib/utils/seo";
import { WHATSAPP_NUMBER } from "@/lib/utils/constants";

type Params = { params: Promise<{ slug: string }> };
const SITE_URL = "https://neonvisuals.in";

export function generateStaticParams() {
  return OCCASIONS.map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const occasion = getOccasionBySlug(slug);
  if (!occasion) {
    return buildMetadata({ title: "Occasion", description: "" });
  }
  return buildMetadata({
    title: occasion.seoTitle,
    description: occasion.seoDescription,
    keywords: occasion.seoKeywords,
    path: `/occasions/${occasion.slug}`,
  });
}

interface Kit {
  tier: string;
  range: string;
  items: string[];
}

function buildKits(products: Product[]): Kit[] {
  const names = products.map((p) => p.name);
  return [
    {
      tier: "Budget Kit",
      range: "Under ₹1,000",
      items: [names[0] ?? "Personalised desk piece", "Personalised name card"],
    },
    {
      tier: "Standard Kit",
      range: "₹1,000 – ₹3,000",
      items: [
        names[0] ?? "Personalised desk piece",
        names[1] ?? "Premium gift box",
        "Handwritten-style note from leadership",
      ],
    },
    {
      tier: "Premium Kit",
      range: "₹3,000 and above",
      items: [
        names[0] ?? "Signature keepsake",
        names[1] ?? "Premium desk piece",
        names[2] ?? "Wax-sealed leadership letter",
        "Camera-ready premium packaging",
        "Personalised narrative card",
      ],
    },
  ];
}

export default async function OccasionPage({ params }: Params) {
  const { slug } = await params;
  const occasion = getOccasionBySlug(slug);
  if (!occasion) notFound();

  const products = occasion.recommendedSkus
    .map((sku) => PRODUCTS.find((p) => p.sku === sku))
    .filter((p): p is Product => Boolean(p))
    .slice(0, 4);

  const kits = buildKits(products);
  const related = relatedOccasions(occasion.slug, 3);
  const heroWa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi, I'd like to explore ${occasion.title} for my team. Please share details.`,
  )}`;

  const jsonLd: Record<string, unknown>[] = [
    breadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Occasions", url: "/occasions" },
      { name: occasion.title, url: `/occasions/${occasion.slug}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${occasion.title} — Recommended Gifts`,
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
  if (occasion.faq.length > 0) {
    jsonLd.push(
      faqJsonLd(occasion.faq.map((f) => ({ question: f.q, answer: f.a }))),
    );
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* HERO */}
      <section className="bg-background">
        <div className="mx-auto max-w-[1200px] px-6 py-20">
          <nav className="text-sm text-[#888888]" aria-label="Breadcrumb">
            <Link href="/occasions" className="hover:text-navy">
              Occasions
            </Link>{" "}
            <span aria-hidden="true">/</span>{" "}
            <span className="text-[#1A1A1A]">{occasion.title}</span>
          </nav>

          <div className="mt-8 max-w-3xl">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-navy text-gold">
              <OccasionIcon name={occasion.icon} className="size-7" />
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#1A1A1A] sm:text-5xl">
              {occasion.headline}
            </h1>
            <p className="mt-5 text-lg leading-[1.7] text-[#555555]">
              {occasion.description}
            </p>

            {occasion.heroStat ? (
              <div className="mt-8 rounded-2xl border-l-4 border-gold bg-secondary/60 p-6">
                <p className="font-numbers text-base font-medium text-[#1A1A1A]">
                  {occasion.heroStat}
                </p>
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/get-quote"
                className="group inline-flex h-13 items-center gap-2 rounded-full bg-navy px-8 text-[15px] font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
              >
                Get a Quote
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href={heroWa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-13 items-center gap-2 rounded-full border-2 border-green-600 px-7 text-[15px] font-semibold text-green-700 transition-colors duration-200 hover:bg-green-50"
              >
                <MessageCircle className="size-4" /> Chat on WhatsApp
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* WHY IT MATTERS */}
      <section className="bg-secondary/40 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-[2.5rem]">
              Why It Matters
            </h2>
            <p className="mt-6 text-lg leading-[1.9] text-[#444444]">
              {occasion.whyItMatters}
            </p>
          </Reveal>
        </div>
      </section>

      {/* RECOMMENDED PRODUCTS */}
      {products.length > 0 ? (
        <section className="bg-background py-24">
          <div className="mx-auto max-w-[1200px] px-6">
            <Reveal>
              <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-[2.5rem]">
                Recommended for {occasion.title}
              </h2>
              <p className="mt-4 text-lg text-[#666666]">
                Hand-picked pieces — every one personalised, not just packaged.
              </p>
            </Reveal>
            <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
              {products.map((product, i) => (
                <Reveal key={product.id} delay={(i % 4) * 80}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* CURATE A KIT CTA */}
      <section className="bg-background pb-4 pt-2">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-gold/30 bg-gold/5 p-8 text-center">
            <p className="text-lg font-semibold text-[#1A1A1A]">
              Want a tailored mix for {occasion.title}?
            </p>
            <Link
              href="/gift-builder"
              className="inline-flex h-12 items-center rounded-full bg-gold px-7 text-sm font-semibold text-navy transition-all duration-200 hover:scale-[1.02] hover:brightness-105"
            >
              Curate a Custom {occasion.title} Kit →
            </Link>
          </div>
        </div>
      </section>

      {/* KIT SUGGESTIONS */}
      <section className="bg-secondary/40 py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-[2.5rem]">
                Kits for Every Budget
              </h2>
              <p className="mt-4 text-lg text-[#666666]">
                Three ready-to-go starting points. Tweak any of them in the Gift
                Builder.
              </p>
            </div>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {kits.map((kit, i) => (
              <Reveal key={kit.tier} delay={i * 80}>
                <div className="flex h-full flex-col rounded-2xl border border-[#EDE9E3] bg-white p-8 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <h3 className="text-lg font-bold text-[#1A1A1A]">{kit.tier}</h3>
                  <span className="font-numbers mt-1 text-sm font-medium text-gold">
                    {kit.range}
                  </span>
                  <ul className="mt-5 flex-1 space-y-3">
                    {kit.items.map((item) => (
                      <li key={item} className="flex gap-3 text-sm text-[#555555]">
                        <span className="text-gold" aria-hidden="true">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/gift-builder"
                    className="group mt-6 inline-flex items-center gap-1 text-sm font-semibold text-navy hover:text-gold"
                  >
                    Build This Kit
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {occasion.faq.length > 0 ? (
        <section className="bg-background py-24">
          <div className="mx-auto max-w-3xl px-6">
            <Reveal>
              <h2 className="text-center text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-[2.5rem]">
                Frequently Asked Questions
              </h2>
            </Reveal>
            <Reveal className="mt-10">
              <Accordion type="single" collapsible className="w-full">
                {occasion.faq.map((f, i) => (
                  <AccordionItem key={f.q} value={`item-${i}`}>
                    <AccordionTrigger className="text-left text-base font-semibold text-[#1A1A1A]">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-[15px] leading-[1.7] text-[#555555]">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* RELATED OCCASIONS */}
      <section className="bg-secondary/40 py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-[2.5rem]">
              Related Occasions
            </h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {related.map((r, i) => (
              <Reveal key={r.slug} delay={i * 80}>
                <Link href={`/occasions/${r.slug}`} className="group block h-full">
                  <div className="flex h-full items-center gap-4 rounded-2xl border border-[#EDE9E3] bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy text-gold">
                      <OccasionIcon name={r.icon} className="size-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-[#1A1A1A]">
                        {r.title}
                      </h3>
                      <span className="text-sm font-semibold text-gold transition-transform duration-200 group-hover:translate-x-1">
                        Explore →
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-linear-to-r from-navy to-[#2a2a4a] py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-[#FAFAF8] sm:text-[2.5rem]">
              Let&apos;s Create Something Memorable
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-[1.7] text-[#9CA3AF]">
              Start with a conversation. No catalogs, no commitments — just good
              gifting, personalised for your team.
            </p>
            <div className="mt-9 flex justify-center">
              <Link
                href={heroWa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-13 items-center gap-2 rounded-full bg-[#25D366] px-8 text-[15px] font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:brightness-110"
              >
                <MessageCircle className="size-4" /> Chat on WhatsApp
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
