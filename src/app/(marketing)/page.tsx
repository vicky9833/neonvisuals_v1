import type { Metadata } from "next";
import Link from "next/link";
import { getRecentPosts } from "@/lib/engines/blog";
import { BlogCard } from "@/components/blog/BlogCard";
import {
  ArrowRight,
  Award,
  Brain,
  CalendarClock,
  ClipboardCheck,
  Clock,
  Crown,
  Flame,
  Gift,
  Handshake,
  LayoutDashboard,
  Leaf,
  type LucideIcon,
  MessageCircle,
  Package,
  PenLine,
  SearchX,
  Sparkles,
  Star,
} from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { CorporateTabs } from "@/components/marketing/corporate-tabs";
import { CountUp } from "@/components/marketing/count-up";
import { ProductCard } from "@/components/products/product-card";
import { PRODUCTS } from "@/lib/catalog";
import {
  PHONE,
  SUPPORT_EMAIL,
  TAGLINE,
  WHATSAPP_NUMBER,
} from "@/lib/utils/constants";

const SITE_URL = "https://neonvisuals.in";

export const metadata: Metadata = {
  title: {
    absolute: "Neon Visuals — Premium Corporate Gifting Platform | Bangalore",
  },
  description:
    "Premium personalised corporate gifts for employee recognition, onboarding, and festivals. Name-first gifting trusted by 50+ Bangalore startups. Enquire today.",
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
    title: "Neon Visuals — Premium Corporate Gifting Platform | Bangalore",
    description:
      "Premium personalised corporate gifts for employee recognition, onboarding, and festivals. Name-first gifting trusted by 50+ Bangalore startups.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Neon Visuals — Premium Corporate Gifting Platform | Bangalore",
    description:
      "Name-first personalised employee experience gifts. Nothing generic. Nothing forgettable.",
  },
};

const HERO_WA = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hi, I'd like to explore corporate gifting options for my team.",
)}`;

const FEATURES = [
  { icon: Sparkles, title: "Smart Gift Matching", desc: "Tell us the occasion, budget, and team size. We recommend what works — not what's left in stock.", tone: "navy" },
  { icon: Gift, title: "Occasion-First Approach", desc: "Onboarding? Anniversary? Diwali? Start with the moment, not the merchandise.", tone: "gold" },
  { icon: PenLine, title: "Name-First, Always", desc: "Every gift carries the recipient's name and a message from leadership. Logo comes second.", tone: "navy" },
  { icon: CalendarClock, title: "Never Miss a Moment", desc: "Birthdays, work anniversaries, festivals — we track them all and remind you 30 days ahead.", tone: "gold" },
  { icon: LayoutDashboard, title: "Your Gifting Command Centre", desc: "Employees, occasions, quotes, orders, budgets — all in one place. No spreadsheets.", tone: "navy" },
  { icon: Package, title: "Unboxing, Perfected", desc: "Camera-ready packaging, QC'd before dispatch. Every box is designed for the 8-second opening moment.", tone: "gold" },
  { icon: Brain, title: "Gift Memory That Compounds", desc: "Year 2 references Year 1. Year 3 tells the full story. We never repeat, we never forget.", tone: "navy" },
  { icon: MessageCircle, title: "Real Humans on WhatsApp", desc: "No chatbots, no ticket queues. Message us on WhatsApp and a real person responds within the hour.", tone: "gold" },
];

const CATEGORIES: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Onboarding Kits", href: "/occasions/onboarding-gifts", icon: Gift },
  { label: "Work Anniversary", href: "/occasions/work-anniversary-gifts", icon: Award },
  { label: "Diwali Gifting", href: "/occasions/diwali-corporate-gifts", icon: Flame },
  { label: "CEO Recognition", href: "/occasions/ceo-recognition-gifts", icon: Crown },
  { label: "Client Appreciation", href: "/occasions/client-appreciation-gifts", icon: Handshake },
  { label: "Spot Awards", href: "/occasions/spot-award-gifts", icon: Star },
  { label: "Eco Gifts", href: "/occasions/sustainable-eco-gifts", icon: Leaf },
  { label: "Experience Kits", href: "/products", icon: Package },
];

const MOST_COMPANIES = [
  "One generic box for everyone, from intern to VP",
  "A logo where a name should be",
  "Opened, forgotten, donated — in that order",
  "Investment measured per unit, not per memory created",
];

const WE_DO = [
  "Every gift carries the recipient's actual name",
  "A handwritten-style message from their CEO or manager",
  "Designed for the eight-second opening that changes perception",
  "Still on their desk three years later — we've checked",
];

const STEPS = [
  { n: "01", t: "Tell us the occasion", d: "Onboarding, anniversaries, festivals, recognition — pick the moment and we'll show you what works." },
  { n: "02", t: "We recommend the gift", d: "Matched to your occasion, budget, and team size. No endless scrolling through catalogues." },
  { n: "03", t: "We personalise each one", d: "Names, messages, and packaging — all handled by our personalisation artists, by hand." },
  { n: "04", t: "Delivered with a story", d: "QC'd, photo-proofed, and delivered with intention. You get proof photos before they arrive." },
];

const TIME_SAVERS = [
  {
    icon: SearchX,
    title: "No Endless Scrolling",
    desc: "Skip the catalogue rabbit hole. Tell us the occasion and team size — we shortlist what actually fits.",
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
    desc: "Every gift looks intentional and premium — without you reviewing a single proof by hand.",
  },
] as const;

const UNBOXING = [
  { n: "01", t: "Their name on the box", d: "A small detail. A massive signal." },
  { n: "02", t: "The wax seal breaks", d: "This wasn't mass-produced. It was prepared." },
  { n: "03", t: "Quality is tangible", d: "Anticipation builds as the box opens." },
  { n: "04", t: "Their name, not a logo", d: "The first thing they see is themselves." },
  { n: "05", t: "A personal message", d: "From leadership. The emotional peak." },
];

const TESTIMONIALS = [
  { quote: "We used to hand out the same diary to everyone. Neon Visuals made our onboarding feel like a celebration. New joiners now post their kits on LinkedIn within hours.", name: "Priya M.", role: "HR Lead, Series B Fintech" },
  { quote: "The personalisation was unreal. Each name was engraved, and the CEO's note made it personal. Our Diwali gifting is now a company event.", name: "Rahul K.", role: "Founder, SaaS Startup" },
  { quote: "We've tried four gifting vendors. Neon Visuals is the only one where gifts are still on desks six months later. That's the real test.", name: "Meera S.", role: "People Ops, D2C Brand" },
];

const AVATAR_SHADES = ["bg-navy text-cream", "bg-gold text-navy", "bg-[#7C2D36] text-cream"];

const STATS = [
  { to: 200, suffix: "+", decimals: 0, label: "Gifts delivered" },
  { to: 50, suffix: "+", decimals: 0, label: "Companies trust us" },
  { to: 4.9, suffix: "", decimals: 1, label: "Average rating" },
  { to: 92, suffix: "%", decimals: 0, label: "Desk-test pass rate" },
];

const JOURNAL = [
  { category: "Gifting Ideas", title: "5 Onboarding Kit Ideas That Make Day 1 Unforgettable", slug: "employee-onboarding-kit-ideas" },
  { category: "Industry Insights", title: "Why Your Diwali Gifts Are Forgettable (And How to Fix It)", slug: "why-diwali-gifts-are-forgettable" },
  { category: "Employee Experience", title: "The True Cost of Generic Corporate Gifts", slug: "true-cost-of-generic-corporate-gifts" },
];

const FEATURED = PRODUCTS.filter((p) => p.isFeatured || p.isBestseller).slice(0, 4);

const faqs = [
  {
    q: "What is Neon Visuals?",
    a: "Neon Visuals is a premium corporate gifting platform based in Bangalore that helps companies celebrate employee milestones with personalised physical experiences.",
  },
  {
    q: "What occasions do you cover?",
    a: "We cover employee onboarding, work anniversaries, birthdays, promotions, spot awards, Diwali and festival gifting, client appreciation, and CEO recognition.",
  },
  {
    q: "How does personalisation work?",
    a: "Every gift carries the recipient's name, a personal message from leadership, and premium packaging designed for an 8-second unboxing moment.",
  },
  {
    q: "What is your minimum order?",
    a: "Most products start at a minimum of 5-10 units. We work with companies of 50 to 500+ employees.",
  },
  {
    q: "How do I get started?",
    a: "Simply message us on WhatsApp at 9019409590 or email contact.neonvisuals@gmail.com. We'll have a conversation and create a custom quote within 24 hours.",
  },
];

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
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
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

      {/* HERO */}
      <section className="bg-background">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-16 lg:grid-cols-[55fr_45fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-4 py-1.5 text-[13px] font-medium text-navy shadow-sm">
              <span className="text-gold">✦</span> Employee Experience Studio
            </span>
            <h1 className="mt-6 text-[2.75rem] font-extrabold leading-[1.08] tracking-tight text-[#1A1A1A] sm:text-[3.5rem]">
              Where Creativity
              <br />
              <span className="text-gold">Sparks...</span>
            </h1>
            <p className="mt-6 max-w-[500px] text-[17px] leading-[1.7] text-[#555555]">
              We craft personalised physical experiences for the moments that
              matter — onboarding, milestones, festivals, recognition. Every gift
              carries a name, a message, and a story. Nothing generic. Nothing
              forgettable.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/occasions"
                className="group inline-flex h-13 items-center gap-2 rounded-full bg-navy px-8 text-[15px] font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
              >
                Explore Occasions
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/get-quote"
                className="inline-flex h-13 items-center rounded-full border-2 border-navy px-8 text-[15px] font-semibold text-navy transition-colors duration-200 hover:bg-navy hover:text-cream"
              >
                Get a Quote
              </Link>
            </div>
            <p className="mt-8 text-sm text-[#888888]">
              Trusted by HR leaders at 50+ Bangalore companies
            </p>
          </div>

          {/* Gradient panel */}
          <div className="hidden lg:block">
            <div className="relative mx-auto aspect-4/5 w-full max-w-md overflow-hidden rounded-2xl bg-linear-to-br from-navy via-navy to-gold shadow-xl">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="absolute size-56 rounded-full border border-dashed border-white/20 animate-[spin_30s_linear_infinite]" />
                <span className="absolute size-72 rounded-full border border-white/10 animate-[spin_25s_linear_infinite_reverse]" />
                <span className="animate-float flex size-24 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-sm">
                  <Gift className="size-12 text-gold" />
                </span>
              </div>
              <span className="absolute left-8 top-10 size-2 rounded-full bg-gold/70" />
              <span className="absolute bottom-12 right-10 size-2.5 rounded-full bg-white/50" />
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-[200px] gradient-divider" />
      </section>

      {/* FEATURES */}
      <section className="bg-linear-to-b from-secondary/40 to-background py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-[2.5rem]">
                Everything HR Needs.{" "}
                <span className="text-gold">Nothing They Don&apos;t.</span>
              </h2>
              <p className="mt-4 text-lg text-[#666666]">
                Built for people teams who are tired of generic gifting vendors
                and want something their employees actually keep.
              </p>
            </div>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 4) * 80}>
                <div className="group h-full rounded-2xl border border-[#EDE9E3] bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <span
                    className={`flex size-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${
                      f.tone === "navy" ? "bg-navy text-gold" : "bg-gold text-navy"
                    }`}
                  >
                    <f.icon className="size-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-[#1A1A1A]">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#666666]">
                    {f.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-12 flex justify-center">
            <Link
              href="/how-it-works"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-navy px-7 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
            >
              Discover Features
              <ArrowRight className="size-4 animate-nudge" />
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="bg-secondary/40 py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-[2.5rem]">
                Browse Gift Categories
              </h2>
              <p className="mt-4 text-lg text-[#666666]">
                Explore curated categories for every employee and client moment.
              </p>
            </div>
          </Reveal>
          <Reveal className="mt-12">
            <div className="flex flex-wrap justify-center gap-3">
              {CATEGORIES.map((c) => (
                <Link
                  key={c.label}
                  href={c.href}
                  className="group inline-flex items-center gap-2 rounded-full border border-[#EDE9E3] bg-white px-5 py-2.5 text-sm font-medium text-[#1A1A1A] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-navy hover:text-white"
                >
                  <c.icon className="size-3.5 text-gold group-hover:text-gold" />
                  {c.label}
                </Link>
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <Link
                href="/occasions"
                className="group inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-gold"
              >
                View All Categories
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="bg-background py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <h2 className="text-center text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-[2.5rem]">
              The <span className="font-numbers text-gold">₹12,000 Crore</span>{" "}
              Problem
            </h2>
            <p className="mx-auto mt-5 max-w-[620px] text-center text-base leading-[1.8] text-[#555555]">
              Indian companies spend ₹12,000 crore on corporate gifts annually.
              Most end up in drawers by Friday. The problem isn&apos;t the budget
              — it&apos;s the complete absence of intent.
            </p>
          </Reveal>
          <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-2xl border border-[#EDE9E3] bg-white p-10 shadow-sm">
                <h3 className="text-[13px] font-semibold uppercase tracking-widest text-[#999999]">
                  What Most Companies Do
                </h3>
                <ul className="mt-6 divide-y divide-[#F0EDE8]">
                  {MOST_COMPANIES.map((item) => (
                    <li key={item} className="flex gap-3 py-4 text-base text-[#666666]">
                      <span className="text-[#CCCCCC]" aria-hidden="true">—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="h-full rounded-2xl bg-navy p-10 shadow-lg">
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

      {/* FEATURED PRODUCTS */}
      <section className="bg-secondary/40 py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-[2.5rem]">
                  Pieces Worth Keeping
                </h2>
                <p className="mt-4 text-lg text-[#666666]">
                  A few of our most-loved pieces — every one personalised, not
                  just packaged.
                </p>
              </div>
              <Link
                href="/products"
                className="group inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-gold"
              >
                See All
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
          <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {FEATURED.map((product, i) => (
              <Reveal key={product.id} delay={(i % 4) * 80}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* gradient divider */}
      <div className="bg-background">
        <div className="mx-auto max-w-[200px] gradient-divider" />
      </div>

      {/* HOW IT WORKS */}
      <section className="bg-background py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <h2 className="text-center text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-[2.5rem]">
              How It Works
            </h2>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-12 sm:grid-cols-2 md:grid-cols-4 md:gap-8">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 80}>
                <div>
                  <span className="font-numbers text-[3.5rem] font-bold leading-none text-gold">
                    {step.n}
                  </span>
                  <span className="mt-3 mb-5 block h-0.5 w-10 bg-gold" />
                  <h3 className="text-base font-bold text-[#1A1A1A]">{step.t}</h3>
                  <p className="mt-2 text-sm text-[#777777]">{step.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TIME-SAVER / VALUE PROPOSITION */}
      <section className="bg-background py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-4 py-1.5 text-[13px] font-medium text-navy shadow-sm">
                <span className="text-gold">✦</span> Built to save you time
              </span>
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-[2.5rem]">
                Gifting That Runs <span className="text-gold">Without You</span>
              </h2>
              <p className="mt-4 text-lg text-[#666666]">
                You have a hundred things to own. Employee gifting shouldn&apos;t
                be one of them. We take the brief and return the result.
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TIME_SAVERS.map((item, i) => (
              <Reveal key={item.title} delay={(i % 4) * 80}>
                <div className="h-full rounded-xl border border-[#E5E2DC] bg-[#F5F0E8] p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-navy text-gold">
                    <item.icon className="size-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-[#1A1A1A]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#666666]">
                    {item.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12">
            <div className="flex justify-center">
              <Link
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                  "Hi, I'd like to save time on my company's gifting. Can you help?",
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-13 items-center gap-2 rounded-full bg-[#25D366] px-8 text-[15px] font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:brightness-110"
              >
                <MessageCircle className="size-4" /> Save Hours — Chat on WhatsApp
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CORPORATE SOLUTIONS */}
      <section className="bg-secondary/40 py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-[2.5rem]">
                Corporate Gifting Solutions
              </h2>
              <p className="mt-4 text-lg text-[#666666]">
                Select the perfect gifting approach for your business needs.
              </p>
            </div>
          </Reveal>
          <Reveal className="mt-12">
            <CorporateTabs />
          </Reveal>
        </div>
      </section>

      {/* UNBOXING — dark */}
      <section className="bg-navy py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#FAFAF8] sm:text-[2.5rem]">
                The 8-Second Moment
              </h2>
              <p className="mt-4 text-lg text-[#9CA3AF]">
                Every gift is designed for the moment it&apos;s opened.
              </p>
            </div>
          </Reveal>
          <Reveal className="mt-16">
            <div className="relative">
              <div className="pointer-events-none absolute left-[10%] right-[10%] top-7 hidden h-px bg-white/15 md:block" />
              <ol className="grid grid-cols-2 gap-y-12 md:flex md:items-start md:justify-between md:gap-6">
                {UNBOXING.map((s) => (
                  <li key={s.n} className="mx-auto flex max-w-[200px] flex-col items-center text-center">
                    <span className="font-numbers bg-navy px-3 text-5xl font-bold text-gold">
                      {s.n}
                    </span>
                    <p className="mt-4 text-[15px] font-semibold text-[#FAFAF8]">{s.t}</p>
                    <p className="mt-2 text-[13px] leading-[1.6] text-[#9CA3AF]">{s.d}</p>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-linear-to-br from-navy/5 to-gold/5 py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-[2.5rem]">
                What People Leaders Say
              </h2>
              <p className="mt-4 text-lg text-[#666666]">
                HR and founders who&apos;ve made their gifting unforgettable.
              </p>
            </div>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={(i % 3) * 80}>
                <figure className="h-full rounded-2xl border border-[#EDE9E3] bg-white p-8 shadow-sm transition-colors duration-200 hover:border-gold">
                  <div className="flex items-center gap-4">
                    <span
                      className={`flex size-12 items-center justify-center rounded-full font-semibold ${AVATAR_SHADES[i % AVATAR_SHADES.length]}`}
                      aria-hidden="true"
                    >
                      {t.name.charAt(0)}
                    </span>
                    <div>
                      <span className="block text-[15px] font-semibold text-[#1A1A1A]">
                        {t.name}
                      </span>
                      <span className="text-[13px] text-[#999999]">{t.role}</span>
                    </div>
                  </div>
                  <blockquote className="mt-5 text-[15px] italic leading-[1.8] text-[#444444]">
                    “{t.quote}”
                  </blockquote>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="mt-20 bg-navy">
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

      {/* CTA */}
      <section className="bg-linear-to-r from-navy to-[#2a2a4a] py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-[#FAFAF8] sm:text-[2.5rem]">
              Start Your Gifting Journey Today
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-[1.7] text-[#9CA3AF]">
              Join 50+ HR managers who&apos;ve discovered what happens when
              gifting gets personal. No catalogs, no commitments — just a
              conversation.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link
                href="/get-quote"
                className="group inline-flex h-13 items-center gap-2 rounded-full bg-gold px-8 text-[15px] font-semibold text-navy transition-all duration-200 hover:scale-[1.02] hover:brightness-110"
              >
                Get Started
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href={HERO_WA}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-13 items-center gap-2 rounded-full bg-[#25D366] px-8 text-[15px] font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:brightness-110"
              >
                <MessageCircle className="size-4" /> Chat on WhatsApp
              </Link>
              <Link
                href="/gift-builder"
                className="inline-flex h-13 items-center gap-2 rounded-full border-2 border-gold px-8 text-[15px] font-semibold text-gold transition-all duration-200 hover:bg-gold hover:text-navy"
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
                9019 409 590
              </a>{" "}
              ·{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#FAFAF8] hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </p>
          </Reveal>
        </div>
      </section>

      {/* JOURNAL */}
      <section className="bg-background py-24">
        <div className="mx-auto max-w-[1200px] px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A] sm:text-[2.5rem]">
                From the Journal
              </h2>
              <p className="mt-4 text-lg text-[#666666]">
                Ideas and insights for employee experience leaders.
              </p>
            </div>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
            {recentPosts.length > 0
              ? recentPosts.map((post, i) => (
                  <Reveal key={post.id} delay={(i % 3) * 80}>
                    <BlogCard post={post} />
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
                      <h3 className="mt-2 text-lg font-bold text-[#1A1A1A] transition-colors group-hover:text-gold">
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
