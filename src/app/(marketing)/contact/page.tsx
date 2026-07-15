import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { ContactForm } from "@/components/marketing/contact-form";
import { FaqSection } from "@/components/shared/faq-section";
import { buildMetadata } from "@/lib/utils/seo";
import {
  LEGACY_EMAIL,
  PHONE,
  PRIMARY_EMAIL,
  WHATSAPP_URL,
} from "@/lib/utils/constants";

export const metadata: Metadata = buildMetadata({
  title: "Contact Neon Visuals - Request a Quote for Premium Gifting",
  description:
    "Get in touch with Neon Visuals for personalized corporate gifts, college event merchandise, and premium gifting solutions. Quotes within 2 hours. PAN India delivery.",
  path: "/contact",
});

const TRUST_ITEMS = [
  "5000+ Gifts Delivered",
  "GST Billing",
  "PAN India Delivery",
  "MOQ from 10 Units",
  "24-Hour Quote",
] as const;

const NEXT_STEPS = [
  {
    title: "Share Your Requirement",
    desc: "Tell us the occasion, team size, and any preferences.",
  },
  {
    title: "We Recommend Products",
    desc: "Our team curates the perfect gift options for your budget.",
  },
  {
    title: "Receive Mockups & Quotation",
    desc: "See exactly how your gifts will look before production.",
  },
  {
    title: "Production & Delivery",
    desc: "We produce, QC, and deliver - with proof photos.",
  },
] as const;

const CORPORATE_BULLETS = [
  "Dedicated account manager",
  "Custom sourcing",
  "White-label packaging",
  "Enterprise invoicing",
] as const;

const COLLEGE_BULLETS = [
  "Welcome kits",
  "Merchandise",
  "Volunteer kits",
  "Speaker gifts",
  "Trophies & medals",
  "Event branding",
] as const;

const CORPORATE_CTA_URL = `${WHATSAPP_URL}?text=${encodeURIComponent(
  "Hi, I'd like to discuss a corporate order.",
)}`;
const COLLEGE_CTA_URL = `${WHATSAPP_URL}?text=${encodeURIComponent(
  "Hi, I'd like to discuss event merchandise.",
)}`;

interface ContactPageProps {
  searchParams: Promise<{ occasion?: string }>;
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const { occasion } = await searchParams;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Neon Visuals",
    url: "https://neonvisuals.in/contact",
    description:
      "Contact the Neon Visuals team for corporate gifting and event merchandise enquiries. Quotes within 2 hours. PAN India delivery.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* HERO */}
      <section className="bg-background py-16 sm:py-20">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-navy sm:text-[3rem]">
                Tell Us Your Occasion. We&apos;ll Handle The Rest.
              </h1>
              <p className="mt-5 text-lg leading-[1.7] text-[#555555]">
                Whether you&apos;re welcoming new employees, celebrating
                milestones, planning a college fest, or sending client
                appreciation gifts - we&apos;ll help you design a memorable
                gifting experience.
              </p>
            </div>
          </Reveal>

          {/* TRUST STRIP */}
          <Reveal className="mt-10">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {TRUST_ITEMS.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-navy"
                >
                  <Check className="size-5 text-gold" />
                  {item}
                </span>
              ))}
            </div>
          </Reveal>

          {/* DIRECT CONTACT - both emails + phone */}
          <Reveal className="mt-8">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#555555]">
              <a
                href={`mailto:${PRIMARY_EMAIL}`}
                className="font-semibold text-navy transition-colors hover:text-gold"
              >
                {PRIMARY_EMAIL}
              </a>
              <span className="text-gold/60" aria-hidden="true">·</span>
              <a
                href={`mailto:${LEGACY_EMAIL}`}
                className="font-semibold text-navy transition-colors hover:text-gold"
              >
                {LEGACY_EMAIL}
              </a>
              <span className="text-gold/60" aria-hidden="true">·</span>
              <a
                href={`tel:${PHONE.replace(/\s+/g, "")}`}
                className="font-semibold text-navy transition-colors hover:text-gold"
              >
                {PHONE}
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FORM + TIMELINE */}
      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-6 lg:grid-cols-[60fr_40fr]">
          <Reveal>
            <ContactForm initialOccasion={occasion} />
          </Reveal>

          <Reveal delay={80}>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
                What Happens Next
              </h2>
              <ol className="relative mt-8 space-y-8 border-l-2 border-gold/40 pl-8">
                {NEXT_STEPS.map((step, i) => (
                  <li key={step.title} className="relative">
                    <span className="absolute left-[-41px] flex size-8 items-center justify-center rounded-full bg-gold text-sm font-bold text-navy">
                      {i + 1}
                    </span>
                    <h3 className="text-base font-bold text-[#1A1A1A]">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#666666]">
                      {step.desc}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CORPORATE + COLLEGE */}
      <section className="bg-background py-16">
        <div className="mx-auto grid max-w-[1200px] gap-6 px-6 md:grid-cols-2">
          <Reveal>
            <div className="flex h-full flex-col rounded-2xl bg-navy p-8 text-white shadow-sm">
              <h2 className="text-2xl font-bold tracking-tight">
                Planning a Large Corporate Order?
              </h2>
              <ul className="mt-5 space-y-2.5">
                {CORPORATE_BULLETS.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-[#D5D5E0]">
                    <Check className="size-4 shrink-0 text-gold" />
                    {b}
                  </li>
                ))}
              </ul>
              <Link
                href={CORPORATE_CTA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex h-12 w-fit items-center gap-2 rounded-full bg-gold px-7 text-sm font-semibold text-navy transition-all duration-200 hover:brightness-110"
              >
                Talk to Our Corporate Team
              </Link>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="flex h-full flex-col rounded-2xl border-2 border-gold bg-[#FAFAF8] p-8 shadow-sm">
              <h2 className="text-2xl font-bold tracking-tight text-navy">
                Planning a College Fest or Event?
              </h2>
              <ul className="mt-5 space-y-2.5">
                {COLLEGE_BULLETS.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-[#555555]">
                    <Check className="size-4 shrink-0 text-gold" />
                    {b}
                  </li>
                ))}
              </ul>
              <Link
                href={COLLEGE_CTA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex h-12 w-fit items-center gap-2 rounded-full bg-navy px-7 text-sm font-semibold text-white transition-all duration-200 hover:bg-navy/90"
              >
                Plan Your Event
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16">
        <FaqSection withJsonLd={false} />
      </section>
    </>
  );
}
