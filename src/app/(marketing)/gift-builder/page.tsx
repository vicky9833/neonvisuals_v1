import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/utils/seo";
import { BUCKETS } from "@/lib/catalog";
import { Breadcrumb } from "@/components/shared/breadcrumb";
import { GiftBuilder } from "@/components/gift-builder/gift-builder";

const SITE_URL = "https://neonvisuals.in";

export const metadata: Metadata = buildMetadata({
  title: "Curate Your Experience Kit — Custom Corporate Gifting | Neon Visuals",
  description:
    "Build a personalised corporate gift kit for your team. Choose from 120+ products, select premium packaging, and submit your enquiry. Response within 2 hours.",
  path: "/gift-builder",
});

export default function GiftBuilderPage() {
  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Gift Builder", url: "/gift-builder" },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Curate Your Experience Kit",
      url: `${SITE_URL}/gift-builder`,
      description:
        "Interactive kit builder — choose products, packaging, and personalisation, then submit an enquiry.",
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
        <div className="mx-auto max-w-[1200px] px-6 py-14">
          <div className="[&_a]:text-cream/70 [&_a:hover]:text-gold [&_span]:text-cream">
            <Breadcrumb items={[{ name: "Home", href: "/" }, { name: "Gift Builder" }]} />
          </div>
          <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[13px] font-medium text-cream">
            <span className="text-gold">✦</span> Interactive Kit Builder
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold tracking-tight text-[#FAFAF8] sm:text-5xl">
            Curate Your Experience Kit
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-[1.7] text-[#9CA3AF]">
            Select products, choose packaging, add your personal touch — we&apos;ll handle the
            rest. Your custom quote in 2 hours.
          </p>
        </div>
      </section>

      <section className="bg-background py-14">
        <div className="mx-auto max-w-[1200px] px-6">
          <GiftBuilder buckets={[...BUCKETS]} />
        </div>
      </section>
    </>
  );
}
