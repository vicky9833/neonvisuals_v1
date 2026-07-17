export type DeliveryStatus =
  | "pending"
  | "in_production"
  | "shipped"
  | "delivered"
  | "returned";

export type DeskTestStatus =
  | "on_desk"
  | "kept_elsewhere"
  | "unknown"
  | "not_kept";

export type RecipientReaction =
  | "loved_it"
  | "liked_it"
  | "neutral"
  | "unknown";

export interface GiftRecord {
  id: string;
  company_id: string;
  employee_id: string;
  product_sku: string;
  product_name: string;
  collection_code: string | null;
  occasion_type: string;
  occasion_label: string | null;
  /** Stable occasion key (7a pattern) — links a delivered gift to its occasion instance. */
  occasion_key: string | null;
  gifted_date: string;
  packaging_tier: string | null;
  personalisation_level: string | null;
  narrative_message: string | null;
  engraving_text: string | null;
  delivery_status: DeliveryStatus;
  delivered_date: string | null;
  delivery_address: string | null;
  tracking_number: string | null;
  recipient_reaction: RecipientReaction | null;
  desk_test_status: DeskTestStatus;
  desk_test_checked_date: string | null;
  feedback_notes: string | null;
  linkedin_posted: boolean;
  /** INTERNAL ONLY - never expose to clients. */
  unit_cost: number | null;
  /** INTERNAL ONLY - never expose to clients. */
  unit_price: number | null;
  quote_id: string | null;
  order_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  /** Joined employee name (when fetched with a join). */
  employee_name?: string;
  employee_department?: string | null;
}

export interface GiftRecordInput {
  employeeId: string;
  productSku: string;
  productName: string;
  collectionCode?: string;
  occasionType: string;
  occasionLabel?: string;
  giftedDate: string;
  packagingTier?: string;
  personalisationLevel?: string;
  narrativeMessage?: string;
  engravingText?: string;
  deliveryStatus?: DeliveryStatus;
  deliveredDate?: string;
  unitCost?: number;
  unitPrice?: number;
}

export interface EmployeePreferences {
  id: string;
  employee_id: string;
  company_id: string;
  preferred_collections: string[] | null;
  avoided_products: string[] | null;
  preferred_packaging: string | null;
  archetype: string | null;
  gift_personality: string | null;
  dietary_notes: string | null;
  allergies: string | null;
  total_gifts_received: number;
  total_gifts_on_desk: number;
  desk_test_score: number;
  last_gifted_date: string | null;
  avg_reaction_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface GiftRecommendation {
  sku: string;
  name: string;
  collection: string;
  imageUrl?: string;
  score: number;
  reason: string;
  warnings: string[];
}

export const OCCASION_TYPES = [
  { value: "onboarding", label: "Onboarding" },
  { value: "birthday", label: "Birthday" },
  { value: "work_anniversary", label: "Work Anniversary" },
  { value: "festive", label: "Festive" },
  { value: "recognition", label: "Recognition" },
  { value: "client", label: "Client Appreciation" },
  { value: "custom", label: "Custom" },
] as const;

export const REACTION_LABELS: Record<string, string> = {
  loved_it: "Loved It",
  liked_it: "Liked It",
  neutral: "Neutral",
  unknown: "Unknown",
};

/** Reaction → numeric score for averages (1=not kept .. 4=loved). */
export const REACTION_SCORE: Record<string, number> = {
  loved_it: 4,
  liked_it: 3,
  neutral: 2,
  unknown: 0,
};
