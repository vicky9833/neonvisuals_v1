import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/marketing/reveal";
import { OccasionIcon } from "@/components/shared/occasion-icon";
import { OCCASIONS } from "@/data/occasions";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/utils/seo";

export const metadata: Metadata = buildMetadata({
  title: "Corporate Gifting Occasions | Employee Recognition Gifts",
  description:
    "Browse premium corporate gifting by occasion — onboarding, work anniversaries, Diwali, leadership recognition, client appreciation and more. Name-first, personalised.",
  path: "/occasions",
});

const jsonLd = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Occasions", url: "/occasions" },
]);

export default function OccasionsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="bg-background py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-4 py-1.5 text-[13px] font-medium text-navy shadow-sm">
                <span className="text-gold">✦</span> Occasion-First Gifting
              </span>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#1A1A1A] sm:text-5xl">
                Every Employee Moment Deserves Intention
              </h1>
              <p className="mt-5 text-lg leading-[1.7] text-[#555555]">
                Start with the moment, not the merchandise. Pick an occasion and
                we&apos;ll craft a personalised experience your team actually
                keeps.
              </p>
            </div>
          </Reveal>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {OCCASIONS.map((o, i) => (
              <Reveal key={o.slug} delay={(i % 3) * 80}>
                <Link href={`/occasions/${o.slug}`} className="group block h-full">
                  <article className="flex h-full flex-col rounded-2xl border border-[#EDE9E3] bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-navy text-gold transition-transform duration-200 group-hover:scale-105">
                      <OccasionIcon name={o.icon} className="size-6" />
                    </span>
                    <h2 className="mt-5 text-lg font-bold text-[#1A1A1A]">
                      {o.title}
                    </h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-[#666666]">
                      {o.description}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-gold transition-transform duration-200 group-hover:translate-x-1">
                      Explore →
                    </span>
                  </article>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
