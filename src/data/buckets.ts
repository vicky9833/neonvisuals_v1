import type { Bucket } from "@/lib/types/product";

/**
 * The 11 collections (A-K). Matches supabase/seed.sql. Used for static
 * generation and client-side filtering without database calls.
 */
export const BUCKETS: readonly Bucket[] = [
  {
    code: "A",
    name: "Welcome & Onboarding",
    slug: "welcome-onboarding",
    purpose: "Make Day 1 unforgettable",
    primaryBuyer: "HR Manager",
    description:
      "Day-1 kits that create instant emotional ownership and desk presence.",
    aspRangeMin: 199,
    aspRangeMax: 4999,
    icon: "PackageOpen",
  },
  {
    code: "B",
    name: "Milestone & Anniversary",
    slug: "milestone-anniversary",
    purpose: "Celebrate tenure and growth",
    primaryBuyer: "HR/People Ops",
    description:
      "Recognition pieces that turn tenure into ritual and collectible memory.",
    aspRangeMin: 499,
    aspRangeMax: 7999,
    icon: "CalendarHeart",
  },
  {
    code: "C",
    name: "CEO & Leadership Recognition",
    slug: "ceo-leadership",
    purpose: "Visible recognition from the top",
    primaryBuyer: "CEO/Founder",
    description:
      "Top-down recognition that feels direct, expensive, and memorable.",
    aspRangeMin: 999,
    aspRangeMax: 14999,
    icon: "Crown",
  },
  {
    code: "D",
    name: "Festive & Seasonal",
    slug: "festive-seasonal",
    purpose: "Festival celebrations done right",
    primaryBuyer: "Admin/HR",
    description:
      "High-volume, occasion-specific festive gifting for teams and clients.",
    aspRangeMin: 299,
    aspRangeMax: 5999,
    icon: "Sparkles",
  },
  {
    code: "E",
    name: "Client Appreciation",
    slug: "client-appreciation",
    purpose: "Strengthen business relationships",
    primaryBuyer: "Sales/BD",
    description:
      "High-ASP gifting that protects relationships and closes future revenue.",
    aspRangeMin: 499,
    aspRangeMax: 9999,
    icon: "Handshake",
  },
  {
    code: "F",
    name: "Experience Kits",
    slug: "experience-kits",
    purpose: "Complete themed gift experiences",
    primaryBuyer: "HR/Culture Team",
    description: "Multi-item flagship experience kits that tell a complete story.",
    aspRangeMin: 1999,
    aspRangeMax: 9999,
    icon: "Gift",
  },
  {
    code: "G",
    name: "Tech-Forward & Digital",
    slug: "tech-forward",
    purpose: "Modern tech-integrated gifts",
    primaryBuyer: "HR/IT",
    description:
      "Modern tech-integrated gifts that are measurable and shareable.",
    aspRangeMin: 799,
    aspRangeMax: 7999,
    icon: "Cpu",
  },
  {
    code: "H",
    name: "Sustainability & Eco",
    slug: "sustainability-eco",
    purpose: "Eco-conscious gifting",
    primaryBuyer: "CSR/HR",
    description:
      "Eco-conscious gifting that is real, beautiful, and never preachy.",
    aspRangeMin: 299,
    aspRangeMax: 4999,
    icon: "Sprout",
  },
  {
    code: "I",
    name: "Events & General Gifts",
    slug: "events-general",
    purpose: "Gifts for every event and everyday moment",
    primaryBuyer: "Admin/HR/Events",
    description:
      "Versatile gifting for conferences, town halls, and everyday corporate moments.",
    icon: "PartyPopper",
  },
  {
    code: "J",
    name: "College Events",
    slug: "college-events",
    purpose: "Campus events done memorably",
    primaryBuyer: "College/Event Committee",
    description:
      "Personalised merch and awards for fests, convocations, and campus programs.",
    icon: "GraduationCap",
  },
  {
    code: "K",
    name: "Visiting Cards & Business Stationery",
    slug: "visiting-cards",
    purpose: "A first impression worth keeping",
    primaryBuyer: "Founders/Sales/Admin",
    description:
      "Premium business cards and stationery that make a first impression count.",
    icon: "Contact",
  },
] as const;
