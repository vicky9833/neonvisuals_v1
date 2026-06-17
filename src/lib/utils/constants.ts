/**
 * Global application constants for Neon Visuals.
 */

export const COMPANY_NAME = "Neon Visuals";
export const TAGLINE = "Where Creativity Sparks";
export const DOMAIN = "neonvisuals.in";
export const SUPPORT_EMAIL = "contact.neonvisuals@gmail.com";
export const PHONE = "+91 9019409590";

/** Digits-only number for wa.me / tel links. */
export const WHATSAPP_NUMBER = "919019409590";
export const WHATSAPP_URL = "https://wa.me/919019409590";

/** Inquiry-first CTAs — prices are never shown publicly. */
export const INQUIRY_CTA_TEXT = "Get Pricing";
export const INQUIRY_CTA_WHATSAPP = "Chat on WhatsApp";

export const GST_RATE = 18;
export const MIN_ORDER_VALUE = 5000;
export const CURRENCY = "INR";
export const CURRENCY_SYMBOL = "₹";

/** Per-unit packaging cost in Rupees by tier. */
export interface PackagingTier {
  key: "budget" | "standard" | "premium" | "flagship";
  name: string;
  perUnitCost: number;
}

export const PACKAGING_TIERS: readonly PackagingTier[] = [
  { key: "budget", name: "Budget", perUnitCost: 125 },
  { key: "standard", name: "Standard", perUnitCost: 275 },
  { key: "premium", name: "Premium", perUnitCost: 575 },
  { key: "flagship", name: "Flagship", perUnitCost: 1150 },
] as const;

/** Rush surcharge multipliers applied to order value. */
export const RUSH_SURCHARGE = {
  under5days: 0.2,
  under48hours: 0.35,
  sameDay: 0.5,
} as const;

export interface OccasionType {
  label: string;
  slug: string;
  /** lucide-react icon name */
  icon: string;
}

export const OCCASION_TYPES: readonly OccasionType[] = [
  { label: "Onboarding & Welcome", slug: "onboarding", icon: "PackageOpen" },
  { label: "Work Anniversary", slug: "work-anniversary", icon: "CalendarHeart" },
  { label: "Birthday", slug: "birthday", icon: "Cake" },
  { label: "Diwali", slug: "diwali", icon: "Sparkles" },
  { label: "Festive & Seasonal", slug: "festive", icon: "Gift" },
  { label: "Leadership Recognition", slug: "leadership", icon: "Crown" },
  { label: "Client Appreciation", slug: "client-appreciation", icon: "Handshake" },
  { label: "Milestone & Awards", slug: "milestones", icon: "Award" },
  { label: "Farewell", slug: "farewell", icon: "Waves" },
  { label: "Team Offsite", slug: "offsite", icon: "Tent" },
] as const;

export interface ArchetypeType {
  name: string;
  description: string;
  /** lucide-react icon name */
  icon: string;
}

export const ARCHETYPE_TYPES: readonly ArchetypeType[] = [
  {
    name: "Achiever",
    description: "Driven by recognition, visible progress, and status.",
    icon: "Trophy",
  },
  {
    name: "Creator",
    description: "Values aesthetic objects, craft, and self-expression.",
    icon: "Palette",
  },
  {
    name: "Explorer",
    description: "Loves utility, journeys, and place-based gifts.",
    icon: "Compass",
  },
  {
    name: "Builder",
    description: "Appreciates tools, structure, and maker logic.",
    icon: "Hammer",
  },
  {
    name: "Root",
    description: "Connects with cultural specificity and origin pride.",
    icon: "Sprout",
  },
  {
    name: "Connector",
    description: "Seeks social warmth, inclusion, and group signals.",
    icon: "Users",
  },
  {
    name: "Scholar",
    description: "Prefers thoughtful, reference-rich, book-led gifts.",
    icon: "BookOpen",
  },
  {
    name: "Minimalist",
    description: "Drawn to quiet premium, restraint, and function.",
    icon: "Minus",
  },
] as const;
