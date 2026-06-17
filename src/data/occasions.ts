/**
 * Occasion data — powers the occasion-first SEO landing pages.
 * `priceRange` describes the occasion's typical investment band (not a
 * product price) and is safe to show publicly.
 */
export interface OccasionFaq {
  q: string;
  a: string;
}

export interface OccasionPriceRange {
  min: number;
  max: number;
}

export interface Occasion {
  slug: string;
  title: string;
  headline: string;
  description: string;
  heroStat?: string;
  whyItMatters: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  recommendedSkus: string[];
  priceRange: OccasionPriceRange;
  /** lucide-react icon name */
  icon: string;
  faq: OccasionFaq[];
}

export const OCCASIONS: Occasion[] = [
  {
    slug: "onboarding-gifts",
    title: "Employee Onboarding Kits",
    headline: "Make Day 1 Unforgettable",
    description:
      "Premium personalised onboarding kits that make every new joiner feel individually welcomed from the moment they open the box.",
    heroStat:
      "9 out of 10 employees say their onboarding gift changed their first impression of the company.",
    whyItMatters:
      "The first 48 hours shape how a new joiner feels about your company more than the next 48 weeks. A generic welcome email gets deleted. A personalised copper bottle with their name engraved — that sits on their desk for three years. That is the difference between onboarding and welcoming.",
    seoTitle:
      "Employee Onboarding Kits | Personalised Welcome Gifts — Neon Visuals",
    seoDescription:
      "Premium personalised onboarding kits for new employees. Name-engraved gifts, welcome hoodies, desk name plates. Trusted by 50+ Bangalore startups.",
    seoKeywords: [
      "employee onboarding kit",
      "welcome kit for new joiners",
      "corporate onboarding gifts",
      "day 1 gift kit bangalore",
    ],
    recommendedSkus: ["NV-A01", "NV-A04", "NV-A09", "NV-A03"],
    priceRange: { min: 199, max: 4999 },
    icon: "Gift",
    faq: [
      { q: "What is the minimum order for onboarding kits?", a: "Most items start at 5-10 units. We work with companies doing as few as 5 onboarding kits per month." },
      { q: "How long does delivery take?", a: "Standard delivery is 7-10 working days. Rush orders can be delivered in 3-5 days with a surcharge." },
      { q: "Can we customise the kit contents?", a: "Absolutely. Use our Gift Builder or speak to our team to create a custom kit tailored to your brand and budget." },
      { q: "Do you personalise each item individually?", a: "Yes. Every item carries the individual recipient name, not just a company logo. That is our core philosophy." },
    ],
  },
  {
    slug: "work-anniversary-gifts",
    title: "Work Anniversary Gifts",
    headline: "Celebrate Milestones That Matter",
    description:
      "From 1-year to 20-year milestones — gifts that honour tenure with the weight it deserves.",
    heroStat:
      "Companies that recognise work anniversaries see 31% lower voluntary turnover.",
    whyItMatters:
      "A work anniversary is not a date on a calendar. It is a decision renewed — the choice to stay, to contribute, to belong. When a company acknowledges that decision with something personal, it signals that the years were noticed. A crystal trophy with a name etched into it says more than any email ever could.",
    seoTitle:
      "Work Anniversary Gifts for Employees | Milestone Recognition — Neon Visuals",
    seoDescription:
      "Premium work anniversary gifts for 1-year, 3-year, 5-year, and 10-year milestones. Personalised trophies, desk pieces, and recognition awards.",
    seoKeywords: [
      "work anniversary gifts",
      "employee milestone gifts",
      "corporate recognition awards",
      "service anniversary gifts india",
    ],
    recommendedSkus: ["NV-B01", "NV-B02", "NV-B03", "NV-B04"],
    priceRange: { min: 499, max: 7999 },
    icon: "Award",
    faq: [
      { q: "Do you handle different gifts for different tenures?", a: "Yes. We recommend different tiers — a desk piece for Year 1, a crystal trophy for Year 5, a premium experience kit for Year 10." },
      { q: "Can our CEO add a personal message?", a: "Every gift includes a personalised narrative card. We even offer handwritten-style messages from leadership." },
      { q: "How do you track anniversaries?", a: "Upload your employee list and our system automatically computes every upcoming anniversary and reminds you 30 days in advance." },
    ],
  },
  {
    slug: "diwali-corporate-gifts",
    title: "Diwali Corporate Gifts",
    headline: "Diwali Gifting Done Right",
    description:
      "Festival gifting that feels personal, not bulk-ordered. Every team member gets something that carries their name.",
    heroStat:
      "76% of employees say a personalised Diwali gift makes them feel more valued than a generic box.",
    whyItMatters:
      "Every Diwali, companies order thousands of identical boxes from a catalogue and call it gifting. Your team knows the difference between a box chosen for them and a box ordered for everyone. One spark of personalisation — their name on the package, a note from their manager — transforms a corporate obligation into a genuine moment.",
    seoTitle:
      "Diwali Corporate Gifts | Personalised Festival Gifting — Neon Visuals",
    seoDescription:
      "Premium personalised Diwali gifts for employees and clients. Not generic experience kits — individually named, thoughtfully packaged festival gifting.",
    seoKeywords: [
      "diwali corporate gifts",
      "diwali gifts for employees",
      "corporate diwali gifting bangalore",
      "personalised diwali gifts",
    ],
    recommendedSkus: ["NV-D01", "NV-D02", "NV-D03", "NV-D04"],
    priceRange: { min: 299, max: 5999 },
    icon: "Flame",
    faq: [
      { q: "When should we place Diwali orders?", a: "We recommend ordering at least 4-6 weeks before Diwali. Early bird orders placed 8 weeks ahead get priority production and delivery." },
      { q: "Can you handle 500+ employees?", a: "Yes. We have fulfilled Diwali orders for companies with 200-500 employees. Our production partners scale with your needs." },
      { q: "Do you offer eco-friendly Diwali options?", a: "Absolutely. Our Sustainability collection includes seed-paper cards, organic candles, and recyclable packaging." },
    ],
  },
  {
    slug: "ceo-recognition-gifts",
    title: "CEO & Leadership Recognition",
    headline: "When It Comes From the Top",
    description:
      "Recognition gifts that carry the weight and intention of leadership. Personal, visible, and impossible to forget.",
    heroStat:
      "Recognition from a CEO is rated 3x more impactful than recognition from a direct manager.",
    whyItMatters:
      "When a CEO takes the time to recognise an individual — with their name on a wax-sealed letter, a crystal piece for their desk — it changes how that person sees the company. Not a mass email. Not a Slack message. A physical object that says: the person at the top noticed you.",
    seoTitle:
      "CEO Recognition Gifts | Leadership Awards for Employees — Neon Visuals",
    seoDescription:
      "Premium CEO recognition gifts — wax-sealed letters, crystal awards, and personalised leadership gifts for star performers.",
    seoKeywords: [
      "ceo recognition gifts",
      "leadership awards employees",
      "executive recognition gifts india",
    ],
    recommendedSkus: ["NV-C01", "NV-C02", "NV-C03"],
    priceRange: { min: 999, max: 14999 },
    icon: "Crown",
    faq: [],
  },
  {
    slug: "client-appreciation-gifts",
    title: "Client Appreciation Gifts",
    headline: "Clients Remember How You Made Them Feel",
    description:
      "Strengthen business relationships with gifts that reflect your brand values and leave a lasting impression.",
    heroStat: "Companies that gift clients see 40% higher retention rates.",
    whyItMatters:
      "A client is not a contract. A client is a relationship. When you send something with their name — not your logo — you signal that the relationship matters more than the transaction.",
    seoTitle:
      "Client Appreciation Gifts | Corporate Relationship Gifting — Neon Visuals",
    seoDescription:
      "Premium client appreciation gifts that strengthen business relationships. Personalised, branded, and memorable.",
    seoKeywords: [
      "client appreciation gifts",
      "corporate client gifts",
      "business relationship gifts",
    ],
    recommendedSkus: ["NV-E01", "NV-E02", "NV-E03"],
    priceRange: { min: 499, max: 9999 },
    icon: "Handshake",
    faq: [],
  },
  {
    slug: "spot-award-gifts",
    title: "Spot Awards & MVP Recognition",
    headline: "Recognise Excellence, Instantly",
    description:
      "Immediate recognition gifts for outstanding performance, quarterly MVPs, and team wins.",
    heroStat: "",
    whyItMatters:
      "The best recognition happens in the moment, not three months later at a town hall.",
    seoTitle: "Spot Award Gifts | Employee MVP Recognition — Neon Visuals",
    seoDescription:
      "Instant employee recognition gifts for spot awards, quarterly MVPs, and team achievements. Premium, personalised.",
    seoKeywords: [
      "spot award gifts",
      "employee mvp recognition",
      "instant recognition gifts corporate",
    ],
    recommendedSkus: ["NV-C01", "NV-B01", "NV-A01"],
    priceRange: { min: 499, max: 5999 },
    icon: "Star",
    faq: [],
  },
  {
    slug: "farewell-retirement-gifts",
    title: "Farewell & Retirement Gifts",
    headline: "End Chapters With Grace",
    description:
      "Send departing team members off with something that honours their contribution and their years.",
    heroStat: "",
    whyItMatters:
      "How you say goodbye says as much about your company as how you say hello.",
    seoTitle:
      "Farewell & Retirement Gifts | Employee Departure Gifts — Neon Visuals",
    seoDescription:
      "Premium farewell and retirement gifts for departing employees. Personalised keepsakes that honour years of contribution.",
    seoKeywords: [
      "farewell gifts employees",
      "retirement gifts corporate",
      "employee departure gifts",
    ],
    recommendedSkus: ["NV-B03", "NV-C02"],
    priceRange: { min: 999, max: 9999 },
    icon: "Heart",
    faq: [],
  },
  {
    slug: "sustainable-eco-gifts",
    title: "Sustainable & Eco-Friendly Gifts",
    headline: "Conscious Gifting Choices",
    description:
      "Eco-conscious corporate gifts made from sustainable materials — bamboo, recycled, organic, and plantable.",
    heroStat: "",
    whyItMatters:
      "Your gifting choices reflect your company values. Eco-conscious gifts tell your team and clients that you think about the future, not just the moment.",
    seoTitle:
      "Eco-Friendly Corporate Gifts | Sustainable Gifting — Neon Visuals",
    seoDescription:
      "Sustainable corporate gifts — bamboo products, seed paper, organic candles, recycled packaging. Eco-conscious gifting for modern companies.",
    seoKeywords: [
      "eco friendly corporate gifts",
      "sustainable corporate gifting",
      "green gifts for employees",
    ],
    recommendedSkus: ["NV-H01", "NV-H02", "NV-H03"],
    priceRange: { min: 299, max: 4999 },
    icon: "Leaf",
    faq: [],
  },
  {
    slug: "festive-season-gifts",
    title: "Festive & Seasonal Gifts",
    headline: "Every Festival, Personalised",
    description:
      "Holi, Christmas, Pongal, Onam, Eid — festival gifting with individual personalisation at scale.",
    heroStat: "",
    whyItMatters:
      "Festivals are the one time every company gifts. The question is whether your team remembers yours or everyone's.",
    seoTitle:
      "Festival Corporate Gifts | Seasonal Employee Gifting — Neon Visuals",
    seoDescription:
      "Corporate festival gifts for Holi, Christmas, Pongal, and all Indian festivals. Personalised at scale.",
    seoKeywords: [
      "festival corporate gifts",
      "seasonal employee gifts india",
      "holi christmas corporate gifting",
    ],
    recommendedSkus: ["NV-D01", "NV-D02", "NV-D03"],
    priceRange: { min: 299, max: 5999 },
    icon: "Sparkles",
    faq: [],
  },
  {
    slug: "experience-kits",
    title: "Experience Kits",
    headline: "Complete Themed Gift Experiences",
    description:
      "Curated multi-item kits that tell a story — from Day 1 Welcome Kits to Leadership Recognition Boxes.",
    heroStat: "",
    whyItMatters:
      "A single item is a gift. A curated kit is an experience. The difference is in the story each piece tells together.",
    seoTitle: "Corporate Experience Kits | Curated Gift Boxes — Neon Visuals",
    seoDescription:
      "Curated multi-item corporate gift kits for onboarding, recognition, and festivals. Complete themed experiences.",
    seoKeywords: [
      "corporate gift kits",
      "experience kits employees",
      "curated gift boxes corporate",
    ],
    recommendedSkus: ["NV-F01", "NV-F02"],
    priceRange: { min: 1999, max: 9999 },
    icon: "Package",
    faq: [],
  },
];

export function getOccasionBySlug(slug: string): Occasion | undefined {
  return OCCASIONS.find((o) => o.slug === slug);
}

/** Returns up to `count` other occasions related to the given slug. */
export function relatedOccasions(slug: string, count = 3): Occasion[] {
  const idx = OCCASIONS.findIndex((o) => o.slug === slug);
  if (idx === -1) return OCCASIONS.slice(0, count);
  const related: Occasion[] = [];
  for (let i = 1; related.length < count && i < OCCASIONS.length; i += 1) {
    related.push(OCCASIONS[(idx + i) % OCCASIONS.length]);
  }
  return related;
}
