import type { Metadata } from "next";
import Link from "next/link";
import {
  Building,
  Building2,
  GraduationCap,
  Heart,
  Hospital,
  Hotel,
  Landmark,
  PartyPopper,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { TeamAvatar } from "@/components/marketing/team-avatar";
import {
  LINKEDIN_URL,
  PHONE,
  PHONE_2,
  SUPPORT_EMAIL,
  TAGLINE,
  WHATSAPP_URL,
} from "@/lib/utils/constants";
import { buildMetadata } from "@/lib/utils/seo";

export const metadata: Metadata = buildMetadata({
  title: "About Neon Visuals - Premium Gifting Studio",
  description:
    "Learn about Neon Visuals - India's premium personalized gifting studio for corporates, colleges, events, and institutions. Crafted with Intention. Remembered with Pride.",
  path: "/about",
});

/** Absolute site origin, used for fully-qualified JSON-LD image URLs. */
const SITE_ORIGIN = "https://neonvisuals.in";

/** Founder record. Every founder has a portrait photo and a LinkedIn profile. */
interface Founder {
  name: string;
  title: string;
  photo: string;
  linkedin: string;
}

const FOUNDERS: readonly Founder[] = [
  {
    name: "Vikas Vishwakarma",
    title: "Co-Founder",
    photo: "/team/vikas.png",
    linkedin: "https://www.linkedin.com/in/Vikas-Vishwakarma-Neonvisuals",
  },
  {
    name: "Purushuttam Kumar",
    title: "Co-Founder",
    photo: "/team/puru.png",
    linkedin: "https://www.linkedin.com/in/purushuttam-kumar",
  },
  {
    name: "Shivam Maurya",
    title: "Co-Founder",
    photo: "/team/shivam.png",
    linkedin: "https://www.linkedin.com/in/shivammaurya10",
  },
] as const;

const INDUSTRIES: readonly { icon: LucideIcon; label: string }[] = [
  { icon: Building2, label: "Corporate" },
  { icon: Rocket, label: "Startups" },
  { icon: GraduationCap, label: "Educational Institutes" },
  { icon: Landmark, label: "Government" },
  { icon: PartyPopper, label: "Events" },
  { icon: Heart, label: "NGOs" },
  { icon: Hospital, label: "Hospitals" },
  { icon: Hotel, label: "Hotels & Hospitality" },
  { icon: Building, label: "Real Estate & Builders" },
] as const;

const TRUST_ROWS: readonly { label: string; value: string; href?: string }[] = [
  { label: "GSTIN", value: "27BZSPV5411Q1ZA" },
  { label: "Established", value: "2024" },
  { label: "Headquarters", value: "Mumbai, Maharashtra, India" },
  { label: "Delivery", value: "PAN India Available" },
  { label: "Business Hours", value: "Monday - Saturday · 9:00 AM - 7:00 PM" },
  { label: "Email", value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
  { label: "Phone", value: `${PHONE} · ${PHONE_2}` },
  { label: "Google Reviews", value: "★ 5.0" },
] as const;

/** Inline LinkedIn glyph - this project's lucide build does not export it. */
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Neon Visuals",
    url: "https://neonvisuals.in",
    description:
      "India's premium personalized gifting studio for corporates, colleges, events, and institutions.",
    slogan: TAGLINE,
    email: SUPPORT_EMAIL,
    telephone: [PHONE, PHONE_2],
    foundingDate: "2024",
    founder: FOUNDERS.map((f) => ({
      "@type": "Person",
      name: f.name,
      jobTitle: f.title,
      worksFor: { "@type": "Organization", name: "Neon Visuals" },
      sameAs: [f.linkedin],
      image: `${SITE_ORIGIN}${f.photo}`,
    })),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bengaluru",
      addressRegion: "Karnataka",
      addressCountry: "IN",
    },
    sameAs: [LINKEDIN_URL, WHATSAPP_URL],
  };

  return (
    <div className="bg-[#FAFAF8] text-[#333333]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 1. Hero */}
      <section className="mx-auto max-w-3xl px-4 pt-20 pb-16 sm:px-6 sm:pt-24 lg:px-8">
        <Reveal>
          <span className="inline-block rounded-full border border-[#C4A35A] px-4 py-1 text-xs font-semibold tracking-widest text-[#C4A35A] uppercase">
            Our Story
          </span>
          <h1 className="mt-6 text-3xl font-bold leading-tight text-[#1A1A2E] sm:text-4xl md:text-5xl">
            Most Gifting Companies Begin with Products. We Began with a Question.
          </h1>
          <p className="mt-6 text-lg font-medium text-[#1A1A2E] sm:text-xl">
            Why do so many expensive corporate gifts end up forgotten within a week?
          </p>
        </Reveal>
        <Reveal delay={120}>
          <div className="mt-8 space-y-5 text-base leading-relaxed sm:text-lg">
            <p>
              After designing hundreds of personalised gifts for companies across India, we
              realised something simple: people don&apos;t remember gifts. They remember how a
              gift made them feel.
            </p>
            <p>
              That became Neon Visuals. Today we create premium personalised experiences for
              employee onboarding, recognition, client appreciation, college events, and
              celebrations that people actually keep.
            </p>
            <p>
              Every product carries the recipient&apos;s name. Every box is assembled by hand.
              Every moment is designed for the 8-second opening that changes perception.
            </p>
          </div>
        </Reveal>
      </section>

      {/* 2. Industries We Serve */}
      <section className="border-t border-[#EDE9E3] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="text-center text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
              Industries We Serve
            </h2>
          </Reveal>
          <ul className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-2 md:grid-cols-3">
            {INDUSTRIES.map(({ icon: Icon, label }, i) => (
              <li key={label}>
                <Reveal delay={i * 60}>
                  <div className="group flex flex-col items-center text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A1A2E] transition-colors duration-300 group-hover:bg-[#C4A35A]">
                      <Icon
                        className="h-6 w-6 text-[#C4A35A] transition-colors duration-300 group-hover:text-white"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="mt-3 text-sm font-semibold text-[#1A1A2E]">{label}</span>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. Founding Members */}
      <section className="border-t border-[#EDE9E3] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="text-center text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
              The Team Behind Neon Visuals
            </h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {FOUNDERS.map((f, i) => (
              <Reveal key={f.name} delay={i * 80}>
                <div className="flex flex-col items-center rounded-xl border border-[#EDE9E3] bg-white px-6 py-8 text-center">
                  <div className="mx-auto mb-4 h-48 w-48 overflow-hidden rounded-full border-4 border-[#C4A35A]">
                    <TeamAvatar src={f.photo} name={f.name} title={f.title} />
                  </div>
                  <h3 className="text-xl font-bold text-[#1A1A2E]">{f.name}</h3>
                  <p className="mt-1 text-sm font-medium text-[#C4A35A]">{f.title}</p>
                  <a
                    href={f.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex text-[#C4A35A] transition-colors hover:text-[#1A1A2E]"
                    aria-label={`${f.name} on LinkedIn`}
                  >
                    <LinkedInIcon className="h-6 w-6" />
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Trust Elements */}
      <section className="border-t border-[#EDE9E3] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className="text-center text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
              Why Organizations Trust Us
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <dl className="mt-12">
              {TRUST_ROWS.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-2 gap-4 border-b border-[#EDE9E3] py-4"
                >
                  <dt className="text-sm text-[#6B7280]">{row.label}</dt>
                  <dd className="text-right font-semibold text-[#1A1A2E]">
                    {row.href ? (
                      <a href={row.href} className="transition-colors hover:text-[#C4A35A]">
                        {row.value}
                      </a>
                    ) : (
                      row.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* 5. CTA */}
      <section className="border-t border-[#EDE9E3] px-4 py-20 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
              Let&apos;s Build Something Memorable.
            </h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex w-full items-center justify-center rounded-lg bg-[#1A1A2E] px-8 py-3 font-semibold text-[#FAFAF8] transition-colors hover:bg-[#2a2a4a] sm:w-auto"
              >
                Get in Touch
              </Link>
              <Link
                href="/collections"
                className="inline-flex w-full items-center justify-center rounded-lg border border-[#C4A35A] px-8 py-3 font-semibold text-[#C4A35A] transition-colors hover:bg-[#C4A35A] hover:text-white sm:w-auto"
              >
                Explore Collections
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
