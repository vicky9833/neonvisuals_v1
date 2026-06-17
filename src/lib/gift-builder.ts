/**
 * Gift Builder config + pure helpers. NO prices, NO DB. "Experience Kit" voice.
 */
import {
  Award,
  Calendar,
  Crown,
  Gem,
  Gift,
  GraduationCap,
  Handshake,
  Heart,
  HelpCircle,
  type LucideIcon,
  Package,
  Sparkles,
  Trophy,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import type { BucketCode, Product } from "@/lib/types/product";
import { PRODUCTS, getBucketByCode } from "@/lib/catalog";
import { WHATSAPP_NUMBER } from "@/lib/utils/constants";

export type PackagingTierId = "essential" | "standard" | "premium" | "flagship";
export type PersonalisationLevelId = "name_only" | "name_occasion" | "full_personal";
export type TimelineId = "within_1_week" | "2_3_weeks" | "1_month_plus" | "exploring";

export interface KitBuilderState {
  occasion: string | null;
  quantity: number;
  selectedProducts: Product[];
  packagingTier: PackagingTierId;
  personalisationLevel: PersonalisationLevelId;
  sampleMessage: string;
  specialInstructions: string;
  timeline: TimelineId;
  contactName: string;
  contactCompany: string;
  contactEmail: string;
  contactPhone: string;
  heardAboutUs: string;
}

export const initialKitState: KitBuilderState = {
  occasion: null,
  quantity: 25,
  selectedProducts: [],
  packagingTier: "standard",
  personalisationLevel: "name_occasion",
  sampleMessage: "",
  specialInstructions: "",
  timeline: "exploring",
  contactName: "",
  contactCompany: "",
  contactEmail: "",
  contactPhone: "",
  heardAboutUs: "",
};

export interface OccasionOption {
  id: string;
  label: string;
  icon: LucideIcon;
  bucket: BucketCode | null;
}

export const OCCASIONS: OccasionOption[] = [
  { id: "onboarding", label: "New Joiner Onboarding", icon: UserPlus, bucket: "A" },
  { id: "milestone", label: "Work Anniversary / Milestone", icon: Award, bucket: "B" },
  { id: "ceo", label: "Star Performer / CEO Recognition", icon: Trophy, bucket: "C" },
  { id: "festive", label: "Festive & Seasonal", icon: Sparkles, bucket: "D" },
  { id: "client", label: "Client Appreciation", icon: Handshake, bucket: "E" },
  { id: "events", label: "Team Event / Offsite", icon: Users, bucket: "I" },
  { id: "college", label: "College Event", icon: GraduationCap, bucket: "J" },
  { id: "custom", label: "Custom / Not Sure", icon: HelpCircle, bucket: null },
];

export function getOccasion(id: string | null): OccasionOption | undefined {
  return OCCASIONS.find((o) => o.id === id);
}

/** Curated recommendation SKUs per occasion (not algorithmic). */
const RECOMMENDED_SKUS: Record<string, string[]> = {
  onboarding: ["NV-A01", "NV-A09", "NV-A03", "NV-A04", "NV-A07"],
  milestone: ["NV-B01", "NV-B05", "NV-B07", "NV-B10"],
  ceo: ["NV-C01", "NV-C03", "NV-C10", "NV-C11"],
  festive: ["NV-D01", "NV-D02", "NV-D03", "NV-D13"],
  client: ["NV-E01", "NV-E04", "NV-E05", "NV-E09"],
  events: ["NV-I04", "NV-I08", "NV-I09", "NV-I11"],
  college: ["NV-J01", "NV-J04", "NV-J06", "NV-J07"],
};

export function getRecommendedProducts(occasionId: string | null): Product[] {
  if (occasionId && RECOMMENDED_SKUS[occasionId]) {
    return RECOMMENDED_SKUS[occasionId]
      .map((sku) => PRODUCTS.find((p) => p.sku === sku))
      .filter((p): p is Product => Boolean(p));
  }
  // custom / unknown → top 6 by wow score
  return [...PRODUCTS]
    .sort((a, b) => (b.wowScore ?? 0) - (a.wowScore ?? 0))
    .slice(0, 6);
}

export function isRecommended(occasionId: string | null, sku: string): boolean {
  return Boolean(occasionId && RECOMMENDED_SKUS[occasionId]?.includes(sku));
}

export interface PackagingTier {
  id: PackagingTierId;
  name: string;
  icon: LucideIcon;
  description: string;
  bestFor: string;
  dots: number;
  badge?: string;
}

export const PACKAGING_TIERS: PackagingTier[] = [
  {
    id: "essential",
    name: "Essential",
    icon: Package,
    description:
      "Clean corrugated box with branded wrap. Tissue paper, satin ribbon, name label on lid.",
    bestFor: "Budget-conscious orders of 100+ units",
    dots: 1,
  },
  {
    id: "standard",
    name: "Standard",
    icon: Gift,
    description:
      "Rigid board box with full-colour print, matt lamination, foil-stamped name. Coloured tissue, grosgrain ribbon, 300 GSM card with wax seal.",
    bestFor: "Most popular — perfect balance of premium feel and value",
    dots: 2,
    badge: "Most Popular",
  },
  {
    id: "premium",
    name: "Premium",
    icon: Crown,
    description:
      "Magnetic-flap rigid box with spot UV, embossed branding. Branded tissue, printed inner lid, custom die-cut foam insert, 350 GSM cotton card with wax seal.",
    bestFor: "CEO recognition, client gifts, milestone celebrations",
    dots: 3,
  },
  {
    id: "flagship",
    name: "Flagship",
    icon: Gem,
    description:
      "Fabric-wrapped drawer or book-style box with gold foil, metal corners, satin lining. Individual item wrapping, 400 GSM letterpress card, QR/NFC digital experience.",
    bestFor: "The ultimate unboxing — top 1% gifts, founder editions",
    dots: 4,
  },
];

export function getPackagingTier(id: PackagingTierId): PackagingTier {
  return PACKAGING_TIERS.find((t) => t.id === id) ?? PACKAGING_TIERS[1];
}

export interface PersonalisationLevel {
  id: PersonalisationLevelId;
  name: string;
  icon: LucideIcon;
  description: string;
  badge?: string;
  /** Whether a narrative message applies. */
  hasMessage: boolean;
}

export const PERSONALISATION_LEVELS: PersonalisationLevel[] = [
  {
    id: "name_only",
    name: "Name Only",
    icon: User,
    description:
      "Each item engraved/printed with the recipient's name. Our signature standard.",
    hasMessage: false,
  },
  {
    id: "name_occasion",
    name: "Name + Occasion",
    icon: Calendar,
    description:
      "Name plus the occasion date or milestone (e.g., 'Priya — 5 Years, Oct 2025'). Perfect for anniversaries and milestones.",
    hasMessage: true,
  },
  {
    id: "full_personal",
    name: "Full Personal Touch",
    icon: Heart,
    description:
      "Name, occasion, plus a unique message from the manager or CEO on the narrative card. Our highest-impact personalisation.",
    badge: "Highest Impact",
    hasMessage: true,
  },
];

export function getPersonalisationLevel(id: PersonalisationLevelId): PersonalisationLevel {
  return PERSONALISATION_LEVELS.find((l) => l.id === id) ?? PERSONALISATION_LEVELS[1];
}

export const TIMELINES: { id: TimelineId; label: string }[] = [
  { id: "within_1_week", label: "Within 1 week" },
  { id: "2_3_weeks", label: "2–3 weeks" },
  { id: "1_month_plus", label: "1 month+" },
  { id: "exploring", label: "No specific date — just exploring" },
];

export function getTimelineLabel(id: TimelineId): string {
  return TIMELINES.find((t) => t.id === id)?.label ?? id;
}

export const QUANTITY_PRESETS: { label: string; value: number }[] = [
  { label: "10–25", value: 10 },
  { label: "25–50", value: 25 },
  { label: "50–100", value: 50 },
  { label: "100–250", value: 100 },
  { label: "250+", value: 250 },
];

export interface KitTemplate {
  id: string;
  name: string;
  occasion: string;
  skus: string[];
  packaging: PackagingTierId;
}

export const TEMPLATES: KitTemplate[] = [
  {
    id: "welcome",
    name: "Day 1 Welcome Kit",
    occasion: "onboarding",
    skus: ["NV-A01", "NV-A09", "NV-A03", "NV-A15"],
    packaging: "standard",
  },
  {
    id: "legacy",
    name: "5-Year Legacy Kit",
    occasion: "milestone",
    skus: ["NV-B05", "NV-B06", "NV-B10"],
    packaging: "premium",
  },
  {
    id: "diwali",
    name: "Diwali Premium Kit",
    occasion: "festive",
    skus: ["NV-D01", "NV-D02", "NV-D13"],
    packaging: "standard",
  },
  {
    id: "ceo-star",
    name: "CEO Star Performer Kit",
    occasion: "ceo",
    skus: ["NV-C01", "NV-C10"],
    packaging: "flagship",
  },
];

export function resolveSkus(skus: string[]): Product[] {
  return skus
    .map((sku) => PRODUCTS.find((p) => p.sku === sku))
    .filter((p): p is Product => Boolean(p));
}

const WA_LIMIT = 4096;

/** Builds the enquiry message body (shared by WhatsApp + email). */
export function buildKitMessage(state: KitBuilderState, opts?: { plain?: boolean }): string {
  const occasion = getOccasion(state.occasion)?.label ?? "Custom";
  const tier = getPackagingTier(state.packagingTier).name;
  const level = getPersonalisationLevel(state.personalisationLevel).name;
  const timeline = getTimelineLabel(state.timeline);
  const b = opts?.plain ? "" : "*";

  const productLines = state.selectedProducts
    .map((p) => `  • ${p.name} (${p.sku})`)
    .join("\n");

  let msg = `Hi! I've curated an Experience Kit on your website. Here are the details:

📋 ${b}Occasion:${b} ${occasion}
📦 ${b}Quantity:${b} ${state.quantity} kits

🎁 ${b}Products Selected (${state.selectedProducts.length} items):${b}
${productLines}

📦 ${b}Packaging:${b} ${tier}
✨ ${b}Personalisation:${b} ${level}`;

  if (state.sampleMessage.trim()) {
    msg += `\n💬 ${b}Sample Message:${b} "${state.sampleMessage.trim()}"`;
  }
  if (state.specialInstructions.trim()) {
    msg += `\n📝 ${b}Special Requirements:${b} ${state.specialInstructions.trim()}`;
  }
  msg += `\n📅 ${b}Timeline:${b} ${timeline}

👤 ${b}Contact:${b}
Name: ${state.contactName}
Company: ${state.contactCompany}
Email: ${state.contactEmail}
Phone: ${state.contactPhone}`;
  if (state.heardAboutUs) msg += `\nHeard about us via: ${state.heardAboutUs}`;
  msg += `\n\nLooking forward to your quote!`;

  // Truncation safeguard: if over the WA limit, drop SKUs to names only.
  if (msg.length > WA_LIMIT) {
    const shortLines = state.selectedProducts
      .slice(0, 10)
      .map((p) => `  • ${p.name}`)
      .join("\n");
    const more =
      state.selectedProducts.length > 10
        ? `\n  ...and ${state.selectedProducts.length - 10} more items`
        : "";
    msg = msg.replace(`${productLines}`, `${shortLines}${more}`);
  }
  return msg;
}

export function buildWhatsAppUrl(state: KitBuilderState): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildKitMessage(state))}`;
}

export function buildEmailUrl(state: KitBuilderState): string {
  const occasion = getOccasion(state.occasion)?.label ?? "Custom";
  const subject = `Experience Kit Enquiry — ${state.contactCompany || "New"} — ${occasion} — ${state.selectedProducts.length} Items`;
  const body = buildKitMessage(state, { plain: true });
  return `mailto:contact.neonvisuals@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Re-export for convenience in client components. */
export { getBucketByCode };

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

export type KitStringField =
  | "sampleMessage"
  | "specialInstructions"
  | "contactName"
  | "contactCompany"
  | "contactEmail"
  | "contactPhone"
  | "heardAboutUs";

export type KitAction =
  | { type: "SET_OCCASION"; occasion: string }
  | { type: "SET_QUANTITY"; quantity: number }
  | { type: "TOGGLE_PRODUCT"; product: Product }
  | { type: "REMOVE_PRODUCT"; sku: string }
  | { type: "SET_PACKAGING"; tier: PackagingTierId }
  | { type: "SET_PERSONALISATION"; level: PersonalisationLevelId }
  | { type: "SET_TIMELINE"; timeline: TimelineId }
  | { type: "SET_FIELD"; field: KitStringField; value: string }
  | { type: "LOAD_TEMPLATE"; occasion: string; products: Product[]; tier: PackagingTierId };

export function kitReducer(state: KitBuilderState, action: KitAction): KitBuilderState {
  switch (action.type) {
    case "SET_OCCASION":
      return { ...state, occasion: action.occasion };
    case "SET_QUANTITY":
      return { ...state, quantity: action.quantity };
    case "TOGGLE_PRODUCT": {
      const exists = state.selectedProducts.some((p) => p.sku === action.product.sku);
      return {
        ...state,
        selectedProducts: exists
          ? state.selectedProducts.filter((p) => p.sku !== action.product.sku)
          : [...state.selectedProducts, action.product],
      };
    }
    case "REMOVE_PRODUCT":
      return {
        ...state,
        selectedProducts: state.selectedProducts.filter((p) => p.sku !== action.sku),
      };
    case "SET_PACKAGING":
      return { ...state, packagingTier: action.tier };
    case "SET_PERSONALISATION":
      return { ...state, personalisationLevel: action.level };
    case "SET_TIMELINE":
      return { ...state, timeline: action.timeline };
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "LOAD_TEMPLATE":
      return {
        ...state,
        occasion: action.occasion,
        selectedProducts: action.products,
        packagingTier: action.tier,
      };
    default:
      return state;
  }
}
