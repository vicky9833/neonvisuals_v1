import type { Metadata } from "next";
import Link from "next/link";
import { getRecentPosts } from "@/lib/engines/blog";
import { BlogCard } from "@/components/blog/BlogCard";
import {
  ArrowRight,
  Award,
  Brain,
  Briefcase,
  Building2,
  CalendarClock,
  ClipboardCheck,
  Clock,
  CreditCard,
  Crown,
  Flame,
  Gift,
  GraduationCap,
  Handshake,
  Heart,
  LayoutDashboard,
  Leaf,
  type LucideIcon,
  MessageCircle,
  Package,
  PenLine,
  Rocket,
  SearchX,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { CountUp } from "@/components/marketing/count-up";
import { HeroBadge } from "@/components/marketing/hero-badge";
import { HeroCarousel } from "@/components/marketing/hero-carousel";
import { FeaturedProducts } from "@/components/marketing/featured-products";
import { FaqSection } from "@/components/shared/faq-section";
import { BUCKETS, getCollectionProductCount, PRODUCTS } from "@/lib/catalog";
import { img } from "@/data/products";
import type { BucketCode, Product } from "@/lib/types/product";
import {
  PHONE,
  SUPPORT_EMAIL,
  TAGLINE,
  WHATSAPP_NUMBER,
  WHATSAPP_URL,
} from "@/lib/utils/constants";

const SITE_URL = "https://neonvisuals.in";

/**
 * Hero showcase images: a mix of "ALL KITS" lifestyle hero shots and premium
 * individual product photos. Every path is verified against the generated
 * catalogue data (src/data/products.ts kitHeroImages + src/data/product-images.ts).
 */
const HERO_CAROUSEL_IMAGES: string[] = [
  img("all-kits/on-boarding-kit-1.png"),
  img("all-kits/curated-gift-box.png"),
  img("all-kits/diwali-premium-hamper.png"),
  img("all-kits/premium-client-hamper.png"),
  img("all-kits/ipl-fan-kit.png"),
  img("all-kits/personalised-anniversary-celebration-gift-box.png"),
  img("all-kits/eco-friendly-kit-1.png"),
  img("all-kits/monsoon-care-kit.png"),
  img("ceo-leadership/crystal-star-trophy-3d-leaser/crystal-star-trophy/crystal-star-trophy1.jpeg"),
  img("ceo-leadership/brass-desk-globe-name-base/brass-desk-globe-name-base-1.jpeg"),
];

export const metadata: Metadata = {
  title: {
    absolute: "Neon Visuals - Premium Corporate Gifting Platform | Bangalore",
  },
  description:
    "Premium personalised corporate gifts for employee recognition, onboarding, and festivals. Name-first gifting trusted by 95+ organizations across India. Enquire today.",
  keywords: [
    "corporate gifting Bangalore",
    "employee experience gifts",
    "personalised corporate gifts India",
    "employee onboarding kits",
    "work anniversary gifts",
    "Diwali corporate gifts",
    "premium corporate gifting",
  ],
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Neon Visuals",
    url: SITE_URL,
    title: "Neon Visuals - Premium Corporate Gifting Platform | Bangalore",
    description:
      "Premium personalised corporate gifts for employee recognition, onboarding, and festivals. Trusted by 95+ organizations across India.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Neon Visuals - Premium Corporate Gifting Platform | Bangalore",
    description:
      "Name-first personalised corporate gifts. Nothing generic. Nothing forgettable.",
  },
};

/* ------------------------------------------------------------------ */
/* Copy blocks (kept as strings so apostrophes render cleanly)         */
/* ------------------------------------------------------------------ */

const HERO_SUB =
  "From employee onboarding and work anniversaries to college festivals, conferences, and client appreciation - we create premium personalized gifts that leave lasting impressions.";

const HERO_STATS = [
  "5000+ Personalized Gifts",
  "95+ Organizations Served",
  "98% On-Time Delivery",
  "4.9★ Client Satisfaction",
] as const;

const WHY_CHOOSE: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Clock,
    title: "Save HR & Admin Time",
    desc: "End-to-end gifting and recognition solutions - sourced, branded, personalized, and delivered. Your team never has to follow up on a single order.",
  },
  {
    icon: Heart,
    title: "Strengthen Culture",
    desc: "Create meaningful moments that foster belonging, appreciation, and pride across every team and milestone.",
  },
  {
    icon: Award,
    title: "Leave Lasting Impact",
    desc: "Curated gifting experiences that people remember long after the occasion has passed.",
  },
];

const TRUSTED_ACROSS: { icon: LucideIcon; label: string }[] = [
  { icon: Building2, label: "Corporates" },
  { icon: Rocket, label: "Startups" },
  { icon: GraduationCap, label: "Educational Institutions" },
  { icon: Users, label: "Events & Communities" },
];

const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Sparkles, title: "Smart Gift Matching", desc: "Tell us the occasion, budget, and team size. We recommend what works - not what's left in stock." },
  { icon: Gift, title: "Occasion-First Approach", desc: "Onboarding? Anniversary? Diwali? Start with the moment, not the merchandise." },
  { icon: PenLine, title: "Name-First, Always", desc: "Every gift carries the recipient's name and a message from leadership. Logo comes second." },
  { icon: CalendarClock, title: "Never Miss a Moment", desc: "Birthdays, work anniversaries, festivals - we track them all and remind you 30 days ahead." },
  { icon: LayoutDashboard, title: "Your Gifting Command Centre", desc: "Employees, occasions, quotes, orders, budgets - all in one place. No spreadsheets." },
  { icon: Package, title: "Unboxing, Perfected", desc: "Camera-ready packaging, QC'd before dispatch. Every box is designed for the 8-second opening moment." },
  { icon: Brain, title: "Gift Memory That Compounds", desc: "Year 2 references Year 1. Year 3 tells the full story. We never repeat, we never forget." },
  { icon: MessageCircle, title: "Real Humans on WhatsApp", desc: "No chatbots, no ticket queues. Message us on WhatsApp and a real person responds within the hour." },
];

const FEATURES_SUBTITLE =
  "Whether you're welcoming new employees, organizing a college fest or event, hosting a conference, celebrating milestones, or thanking clients - we make gifting effortless.";

const CATEGORIES: {
  label: string;
  href: string;
  icon: LucideIcon;
  popular?: boolean;
  /**
   * Collection this pill maps to, when there's a direct match. Used to surface
   * a live product count in the `title` tooltip. Occasion-only pills with no
   * direct collection (e.g. Spot Awards) omit this and show no count.
   */
  bucket?: BucketCode;
}[] = [
  { label: "Employee Onboarding", href: "/occasions/onboarding-gifts", icon: Gift, bucket: "A" },
  { label: "Work Anniversary", href: "/occasions/work-anniversary-gifts", icon: Award, bucket: "B" },
  { label: "Diwali Gifting", href: "/occasions/diwali-corporate-gifts", icon: Flame, bucket: "D" },
  { label: "CEO Recognition", href: "/occasions/ceo-recognition-gifts", icon: Crown, bucket: "C" },
  { label: "Client Appreciation", href: "/occasions/client-appreciation-gifts", icon: Handshake, bucket: "E" },
  { label: "Spot Awards", href: "/occasions/spot-award-gifts", icon: Star },
  { label: "Eco Gifts", href: "/occasions/sustainable-eco-gifts", icon: Leaf, bucket: "H" },
  { label: "Experience Kits", href: "/products", icon: Package, popular: true, bucket: "F" },
  { label: "College Events", href: "/collections", icon: GraduationCap, bucket: "J" },
  { label: "Visiting Cards & Stationery", href: "/collections", icon: CreditCard, bucket: "K" },
  { label: "Conference Merchandise", href: "/collections", icon: Briefcase, bucket: "I" },
  { label: "Festive & Seasonal", href: "/collections", icon: Sparkles, bucket: "D" },
];

const CATEGORIES_SUBTITLE =
  "Explore gifting collections designed for every occasion, audience, and budget.";

const MOST_COMPANIES = [
  "One generic box for everyone, from intern to VP",
  "Logo over personalization.",
  "Opened, forgotten, donated - in that order",
  "Investment measured per unit, not per memory created",
];

const WE_DO = [
  "Every recipient feels personally recognized.",
  "A personalized message from leadership - not a printed template.",
  "Designed for the eight-second opening that changes perception",
  "Still on their desk three years later.",
];

const PROBLEM_SUB =
  "Indian companies spend billions on corporate gifts every year. Most end up in drawers by Friday. The problem isn't the budget - it's the absence of intention.";

const HOWITWORKS_INTRO =
  "Four simple steps from idea to doorstep - designed to save your HR, procurement, or event team time while delivering memorable gifting experiences.";

const STEPS = [
  { n: "01", t: "Tell us the occasion", d: "Onboarding, anniversaries, festivals, recognition - pick the moment and we'll show you what works." },
  { n: "02", t: "We Curate the Perfect Gift", d: "Matched to your occasion, budget, and team size. No endless scrolling through catalogues." },
  { n: "03", t: "We personalise each one", d: "Names, messages, and packaging - all handled by our personalisation artists, by hand." },
  { n: "04", t: "We Bring Every Gift to Life", d: "QC'd, photo-proofed, and delivered with intention. You get proof photos before they arrive." },
];

const TIME_SAVERS = [
  {
    icon: SearchX,
    title: "No Endless Scrolling",
    desc: "Skip the catalogue rabbit hole. Tell us the occasion and team size - we shortlist what actually fits.",
  },
  {
    icon: ClipboardCheck,
    title: "One Brief, Done",
    desc: "Share the details once. We handle selection, personalisation, and packaging end to end.",
  },
  {
    icon: Clock,
    title: "Hours Back Every Week",
    desc: "No vendor chasing, no sample chaos. Your gifting runs in the background while you do your job.",
  },
  {
    icon: Sparkles,
    title: "Consistently On-Brand",
    desc: "Every gift looks intentional and premium - without you reviewing a single proof by hand.",
  },
] as const;

const UNBOXING_SUB =
  "Great gifts aren't remembered when they're delivered. They're remembered when they're opened.";

const UNBOXING = [
  { n: "01", t: "Their name on the box", d: "A small detail. A massive signal." },
  { n: "02", t: "The first impression.", d: "This wasn't mass-produced. It was prepared." },
  { n: "03", t: "Quality is tangible", d: "Anticipation builds as the box opens." },
  { n: "04", t: "Their name, not a logo", d: "The first thing they see is themselves." },
  { n: "05", t: "A personal message", d: "From leadership. The emotional peak." },
];

const TESTIMONIALS = [
  {
    name: "Arjun K.",
    role: "HR Director, Series B Fintech",
    quote:
      "We switched from a generic gifting vendor to Neon Visuals for our Diwali campaign. The difference was night and day - every box had each person's name engraved, and our CEO's handwritten note inside. Three months later, those gifts are still on desks. That's never happened before.",
  },
  {
    name: "Priya S.",
    role: "Event Head, National Engineering College",
    quote:
      "We needed 800 delegate kits for our tech fest with a 10-day deadline. Neon Visuals delivered custom-branded tote bags, notebooks, and bottles - each with the participant's name. The feedback from students and sponsors was incredible.",
  },
  {
    name: "Rahul M.",
    role: "Founder, D2C Startup (45 employees)",
    quote:
      "Our onboarding kits used to be an afterthought - generic diary and pen from whoever was cheapest. Now every new joiner gets a personalized welcome kit. Two of our last five hires mentioned it in their LinkedIn posts. You can't buy that kind of employer branding.",
  },
];

const AVATAR_SHADES = ["bg-navy text-cream", "bg-gold text-navy", "bg-[#7C2D36] text-cream"];

const STATS = [
  { to: 5000, suffix: "+", decimals: 0, label: "Personalized Gifts" },
  { to: 75, suffix: "+", decimals: 0, label: "Organizations Served" },
  { to: 98, suffix: "%", decimals: 0, label: "On-Time Delivery" },
  { to: 4.9, suffix: "★", decimals: 1, label: "Client Satisfaction" },
];

const FINAL_SUB =
  "Whether you're planning employee onboarding, a college fest, a conference, or festive gifting - we'll help you create something people genuinely remember.";

const JOURNAL = [
  { category: "Gifting Ideas", title: "5 Onboarding Kit Ideas That Make Day 1 Unforgettable", slug: "employee-onboarding-kit-ideas" },
  { category: "Industry Insights", title: "Why Your Diwali Gifts Are Forgettable (And How to Fix It)", slug: "why-diwali-gifts-are-forgettable" },
  { category: "Employee Experience", title: "The True Cost of Generic Corporate Gifts", slug: "true-cost-of-generic-corporate-gifts" },
];

/**
 * Eight products for the "Gifts Worth Keeping" section: start with featured
 * products; if fewer than 8, append the first product of each collection
 * (deduped by SKU) until we reach 8.
 */
const FEATURED: Product[] = (() => {
  const out: Product[] = [...PRODUCTS.filter((p) => p.isFeatured)];
  for (const bucket of BUCKETS) {
    if (out.length >= 8) break;
    const first = PRODUCTS.find((p) => p.bucket === bucket.code);
    if (first && !out.some((x) => x.sku === first.sku)) out.push(first);
  }
  return out.slice(0, 8);
})();

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Neon Visuals",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/products?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Neon Visuals",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: `${TAGLINE}. Premium personalised corporate gifting and employee experience platform.`,
    email: SUPPORT_EMAIL,
    telephone: "+919019409590",
  },
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Neon Visuals",
    image: `${SITE_URL}/logo.png`,
    url: SITE_URL,
    telephone: "+919019409590",
    email: SUPPORT_EMAIL,
    priceRange: "₹₹₹",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bangalore",
      addressRegion: "Karnataka",
      addressCountry: "IN",
    },
    areaServed: "IN",
  },
];

export const revalidate = 300;

export default async function HomePage() {
  let recentPosts: Awaited<ReturnType<typeof getRecentPosts>> = [];
  try {
    recentPosts = await getRecentPosts(3);
  } catch {
    recentPosts = [];
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 1) HERO */}
      <section className="overflow-hidden bg-background">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-16 lg:grid-cols-[55fr_45fr] lg:py-20">
          <div>
            <HeroBadge />
            <h1 className="hero-anim-heading mt-6 text-[2.75rem] font-extrabold leading-[1.08] tracking-tight text-navy sm:text-[3.5rem]">
              Crafted with Intention.
              <br />
              <span className="text-[#C4A35A]">Remembered with Pride.</span>
            </h1>
            <p className="hero-anim-sub mt-6 max-w-[500px] text-[17px] leading-[1.7] text-[#555555]">
              {HERO_SUB}
            </p>
            <div className="hero-anim-cta mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/collections"
                className="group inline-flex h-13 items-center gap-2 rounded-full bg-[#1A1A2E] px-8 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-[#2a2a4e]"
              >
                Explore Gift Collections
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/get-quote"
                className="inline-flex h-13 items-center rounded-full border-2 border-[#C4A35A] px-8 text-[15px] font-semibold text-[#C4A35A] transition-colors duration-200 hover:bg-[#C4A35A] hover:text-white"
              >
                Request a Quote
              </Link>
            </div>
            <div className="hero-anim-stats mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#888888]">
              {HERO_STATS.map((stat, i) => (
                <span key={stat} className="inline-flex items-center gap-3">
                  {i > 0 && (
                    <span className="text-gold/60" aria-hidden="true">
                      ·
                    </span>
                  )}
                  <span className="font-numbers">{stat}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Product & kit showcase carousel (stacks below text on mobile). */}
          <div className="mx-auto w-full max-w-md lg:mx-0">
            <HeroCarousel images={HERO_CAROUSEL_IMAGES} />
          </div>
        </div>
        <div className="mx-auto max-w-[200px] gradient-divider" />
      </section>

      {/* 2) PRODUCTS - Gifts Worth Keeping */}
      <section className="bg-white py-10 md:py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A2E]">
                Gifts Worth Keeping
              </h2>
              <p className="mt-4 text-base md:text-lg text-[#666] max-w-2xl mx-auto">
                A few of our most-loved pieces - every one personalised, not just
                packaged. Filter by what you&apos;re gifting.
              </p>
            </div>
          </Reveal>
          <Reveal className="mt-12">
            <FeaturedProducts products={FEATURED} />
          </Reveal>
        </div>
      </section>

      {/* 3) TIME-SAVER - Gifting That Runs Without You */}
      <section className="bg-[#FAFAF8] py-10 md:py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-4 py-1.5 text-[13px] font-medium text-navy shadow-sm">
                <span className="text-gold">✦</span> Built to save you time
              </span>
              <h2 className="mt-6 text-3xl md:text-4xl font-bold text-[#1A1A2E]">
                Gifting That Runs <span className="text-gold">Without You</span>
              </h2>
              <p className="mt-4 text-base md:text-lg text-[#666] max-w-2xl mx-auto">
                You have a hundred things to own. Employee gifting shouldn&apos;t
                be one of them. We take the brief and return the result.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TIME_SAVERS.map((item, i) => (
              <Reveal key={item.title} delay={(i % 4) * 80}>
                <div className="h-full rounded-xl border border-[#EDE9E3] bg-[#F5F0E8] p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-navy text-gold">
                    <item.icon className="size-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-[#1A1A2E]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#333333]">
                    {item.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-10">
            <div className="flex justify-center">
              <Link
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                  "Hi, I'd like to save time on my company's gifting. Can you help?",
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-13 items-center gap-2 rounded-full bg-[#25D366] px-8 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-[#1da851]"
              >
                <MessageCircle className="size-4" /> Save Hours - Chat on WhatsApp
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 4) CATEGORIES - Find the Perfect Gift */}
      <section className="bg-white py-10 md:py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A2E]">
                Find the Perfect Gift
              </h2>
              <p className="mt-4 text-base md:text-lg text-[#666] max-w-2xl mx-auto">
                {CATEGORIES_SUBTITLE}
              </p>
            </div>
          </Reveal>
          <Reveal className="mt-12">
            <div className="flex flex-wrap justify-center gap-3">
              {CATEGORIES.map((c) => {
                const count = c.bucket
                  ? getCollectionProductCount(c.bucket)
                  : 0;
                return (
                <Link
                  key={c.label}
                  href={c.href}
                  title={count > 0 ? `${count} products` : undefined}
                  className="group relative inline-flex items-center gap-2 rounded-full border border-[#EDE9E3] bg-white px-5 py-2.5 text-sm font-medium text-[#1A1A2E] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-navy hover:text-white"
                >
                  <c.icon className="size-3.5 text-gold" />
                  {c.label}
                  {c.popular && (
                    <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy">
                      <Star className="size-3 fill-navy" aria-hidden="true" />
                      Most Popular
                    </span>
                  )}
                </Link>
                );
              })}
            </div>
            <div className="mt-8 flex justify-center">
              <Link
                href="/collections"
                className="group inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-gold"
              >
                Explore All Collections
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5) FEATURES GRID - Every Occasion. Every Team. One Gifting Partner. */}
      <section className="bg-[#FAFAF8] py-10 md:py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A2E]">
                Every Occasion. Every Team.{" "}
                <span className="text-gold">One Gifting Partner.</span>
              </h2>
              <p className="mt-4 text-base md:text-lg text-[#666] max-w-2xl mx-auto">
                {FEATURES_SUBTITLE}
              </p>
            </div>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 4) * 80}>
                <div className="group h-full rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-navy text-gold transition-colors duration-200 group-hover:bg-gold group-hover:text-navy">
                    <f.icon className="size-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-[#1A1A2E]">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#333333]">
                    {f.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10">
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-lg font-semibold text-[#1A1A2E]">
                Need help planning your gifting?
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-[#1A1A2E] px-7 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#2a2a4e]"
                >
                  Talk to an Expert
                </Link>
                <Link
                  href="/gift-builder"
                  className="group inline-flex h-12 items-center gap-2 rounded-full border-2 border-[#C4A35A] px-7 text-sm font-semibold text-[#C4A35A] transition-colors duration-200 hover:bg-[#C4A35A] hover:text-white"
                >
                  Curate Your Kit
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 6) HOW IT WORKS */}
      <section className="bg-white py-10 md:py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A2E]">
                How It Works
              </h2>
              <p className="mt-4 text-base md:text-lg text-[#666] max-w-2xl mx-auto">
                {HOWITWORKS_INTRO}
              </p>
            </div>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-12 sm:grid-cols-2 md:grid-cols-4 md:gap-8">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 80}>
                <div className="group">
                  <span className="font-numbers inline-block origin-left text-[3.5rem] font-bold leading-none text-gold transition-transform duration-200 group-hover:scale-110">
                    {step.n}
                  </span>
                  <span className="mt-3 mb-5 block h-0.5 w-10 bg-gold transition-all duration-200 group-hover:w-16" />
                  <h3 className="text-base font-bold text-[#1A1A2E]">{step.t}</h3>
                  <p className="mt-2 text-sm text-[#333333]">{step.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 7) THE PROBLEM - The Thousand Crore Problem */}
      <section className="bg-[#FAFAF8] py-10 md:py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <h2 className="text-center text-3xl md:text-4xl font-bold text-[#1A1A2E]">
              The <span className="text-gold">Thousand Crore</span> Problem
            </h2>
            <p className="mx-auto mt-5 max-w-[620px] text-center text-base leading-[1.8] text-[#333333]">
              {PROBLEM_SUB}
            </p>
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-xl border border-[#EDE9E3] bg-white p-10 shadow-sm">
                <h3 className="text-[13px] font-semibold uppercase tracking-widest text-[#999999]">
                  What Most Companies Do
                </h3>
                <ul className="mt-6 divide-y divide-[#F0EDE8]">
                  {MOST_COMPANIES.map((item) => (
                    <li key={item} className="flex gap-3 py-4 text-base text-[#666666]">
                      <span className="text-[#CCCCCC]" aria-hidden="true">-</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="h-full rounded-xl bg-navy p-10 shadow-lg">
                <h3 className="text-[13px] font-semibold uppercase tracking-widest text-gold">
                  What We Do Instead
                </h3>
                <ul className="mt-6 divide-y divide-white/10">
                  {WE_DO.map((item) => (
                    <li key={item} className="flex gap-3 py-4 text-base text-[#E8E6E1]">
                      <span className="text-gold" aria-hidden="true">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 8) UNBOXING - The 8-Second Moment (navy) */}
      <section className="bg-[#1A1A2E] py-10 md:py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="relative mx-auto max-w-2xl text-center">
              {/* Subtle gold radial glow behind the heading (~10% opacity) */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-56 w-[36rem] max-w-full -translate-x-1/2 -translate-y-1/2"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(196,163,90,0.10) 0%, rgba(196,163,90,0) 70%)",
                }}
              />
              <h2 className="relative text-3xl md:text-4xl font-bold text-white">
                The 8-Second Moment
              </h2>
              <p className="relative mt-4 text-lg text-[#999] max-w-2xl mx-auto">
                {UNBOXING_SUB}
              </p>
            </div>
          </Reveal>
          <Reveal className="mt-16">
            {/* Desktop: horizontal stepped timeline */}
            <div className="relative hidden md:block">
              {/* Single gold line running through the node centres. */}
              <div
                className="absolute left-0 right-0 top-6 h-[2px] bg-[#C4A35A]"
                aria-hidden="true"
              />
              <ol className="relative flex items-start justify-between">
                {UNBOXING.map((s) => (
                  <li
                    key={s.n}
                    className="group flex flex-1 flex-col items-center px-2"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#C4A35A] text-lg font-bold text-white transition-all duration-300 group-hover:scale-125 group-hover:shadow-[0_0_20px_rgba(196,163,90,0.4)]">
                      {s.n}
                    </span>
                    <span className="h-8 w-[2px] bg-[#C4A35A]" aria-hidden="true" />
                    <div className="max-w-[180px] text-center">
                      <p className="text-lg font-semibold text-white">{s.t}</p>
                      <p className="mt-1 text-sm text-[#999] transition-colors duration-300 group-hover:text-white">
                        {s.d}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Mobile: vertical timeline with the gold line on the left */}
            <ol className="relative space-y-8 md:hidden">
              <div
                className="absolute bottom-0 left-6 top-0 w-[2px] bg-[#C4A35A]"
                aria-hidden="true"
              />
              {UNBOXING.map((s) => (
                <li key={s.n} className="group relative flex items-start gap-4">
                  <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#C4A35A] text-lg font-bold text-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(196,163,90,0.4)]">
                    {s.n}
                  </span>
                  <div className="pt-1">
                    <p className="text-lg font-semibold text-white">{s.t}</p>
                    <p className="mt-1 text-sm text-[#999] transition-colors duration-300 group-hover:text-white">
                      {s.d}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* 9) WHY CHOOSE - Why Teams Choose Us */}
      <section className="bg-white py-10 md:py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A2E]">
                Why Teams Choose Us
              </h2>
              <p className="mt-3 text-lg italic text-gold">
                Recognition Worth Remembering
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {WHY_CHOOSE.map((item, i) => (
              <Reveal key={item.title} delay={(i % 3) * 80}>
                <div className="group h-full rounded-xl border border-[#EDE9E3] bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                  <span className="flex size-14 items-center justify-center rounded-xl bg-navy text-gold transition-colors duration-200 group-hover:bg-gold group-hover:text-navy">
                    <item.icon className="size-7" />
                  </span>
                  <h3 className="mt-5 text-xl font-bold text-[#1A1A2E]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#333333]">
                    {item.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Trusted Across strip */}
          <Reveal className="mt-12">
            <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-[#999999]">
              Trusted Across
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
              {TRUSTED_ACROSS.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-navy"
                >
                  <item.icon className="size-5 text-gold" />
                  {item.label}
                </span>
              ))}
            </div>
          </Reveal>

          {/* CTA */}
          <Reveal className="mt-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-lg font-semibold text-[#1A1A2E]">
                Need help planning your gifting?
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-[#1A1A2E] px-7 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#2a2a4e]"
                >
                  Talk to an Expert
                </Link>
                <Link
                  href="/gift-builder"
                  className="group inline-flex h-12 items-center gap-2 rounded-full border-2 border-[#C4A35A] px-7 text-sm font-semibold text-[#C4A35A] transition-colors duration-200 hover:bg-[#C4A35A] hover:text-white"
                >
                  Curate Your Kit
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 10) TESTIMONIALS + STATS BAR */}
      <section className="bg-[#FAFAF8] py-10 md:py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A2E]">
                What People Leaders Say
              </h2>
              <p className="mt-4 text-base md:text-lg text-[#666] max-w-2xl mx-auto">
                HR, founders, and event leaders who&apos;ve made their gifting
                unforgettable.
              </p>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={`${t.name}-${i}`} delay={(i % 3) * 80}>
                <figure className="h-full rounded-xl border border-[#EDE9E3] bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                  <div className="flex items-center gap-4">
                    <span
                      className={`flex size-12 items-center justify-center rounded-full font-semibold ${AVATAR_SHADES[i % AVATAR_SHADES.length]}`}
                      aria-hidden="true"
                    >
                      {t.name.charAt(0)}
                    </span>
                    <div>
                      <span className="block text-[15px] font-semibold text-[#1A1A2E]">
                        {t.name}
                      </span>
                      <span className="text-[13px] text-[#999999]">{t.role}</span>
                    </div>
                  </div>
                  <blockquote className="mt-5 text-[15px] italic leading-[1.8] text-[#333333]">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>

        {/* STATS BAR (navy) */}
        <div className="mt-16 bg-navy">
          <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-8 px-6 py-12 text-center md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <CountUp
                  to={s.to}
                  suffix={s.suffix}
                  decimals={s.decimals}
                  className="font-numbers block text-[2.5rem] font-bold text-white"
                />
                <div className="mt-1 text-[13px] text-[#9CA3AF]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11) FAQ */}
      <section className="bg-white py-10 md:py-16">
        <FaqSection />
      </section>

      {/* 12) FINAL CTA (navy) */}
      <section className="bg-linear-to-r from-navy to-[#2a2a4a] py-10 md:py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-[#FAFAF8]">
              Let&apos;s Create Something Your Team Will Never Forget.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base md:text-lg leading-[1.7] text-[#9CA3AF]">
              {FINAL_SUB}
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link
                href="/contact"
                className="group inline-flex h-13 items-center gap-2 rounded-full bg-[#C4A35A] px-8 text-[15px] font-semibold text-navy transition-all duration-200 hover:brightness-110"
              >
                Get Started
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-13 items-center gap-2 rounded-full bg-[#25D366] px-8 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-[#1da851]"
              >
                <MessageCircle className="size-4" /> Chat on WhatsApp
              </Link>
              <Link
                href="/gift-builder"
                className="inline-flex h-13 items-center gap-2 rounded-full border-2 border-[#C4A35A] px-8 text-[15px] font-semibold text-[#C4A35A] transition-all duration-200 hover:bg-[#C4A35A] hover:text-white"
              >
                Curate Your Own Experience Kit →
              </Link>
            </div>
            <p className="mt-6 text-sm text-[#9CA3AF]">
              Or call{" "}
              <a
                href={`tel:${PHONE.replace(/\s/g, "")}`}
                className="font-numbers text-[#FAFAF8] hover:underline"
              >
                {PHONE}
              </a>{" "}
              ·{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#FAFAF8] hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </p>
          </Reveal>
        </div>
      </section>

      {/* 13) JOURNAL - From the Journal */}
      <section className="bg-[#FAFAF8] py-10 md:py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A2E]">
                From the Journal
              </h2>
              <p className="mt-4 text-base md:text-lg text-[#666] max-w-2xl mx-auto">
                Ideas and insights for gifting, recognition, and employee
                experience.
              </p>
            </div>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {recentPosts.length > 0
              ? recentPosts.map((post, i) => (
                  <Reveal key={post.id} delay={(i % 3) * 80}>
                    <BlogCard post={post} index={i} />
                  </Reveal>
                ))
              : JOURNAL.map((post, i) => (
                  <Reveal key={post.slug} delay={(i % 3) * 80}>
                    <Link href={`/blog/${post.slug}`} className="group block">
                      <div className="overflow-hidden rounded-xl bg-[#EDE9E3]">
                        <div className="aspect-16/10 w-full transition-all duration-300 group-hover:scale-[1.03] group-hover:brightness-105" />
                      </div>
                      <span className="mt-4 block text-[11px] font-semibold uppercase tracking-widest text-gold">
                        {post.category}
                      </span>
                      <h3 className="mt-2 text-lg font-bold text-[#1A1A2E] transition-colors group-hover:text-gold">
                        {post.title}
                      </h3>
                    </Link>
                  </Reveal>
                ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:underline"
            >
              Read the Journal <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
