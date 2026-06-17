/**
 * Product domain types for the public catalogue (static data layer).
 *
 * IMPORTANT: Prices are INTERNAL only and live in the database. Public data
 * files and pages never include pricing — they use inquiry CTAs instead.
 */

export type BucketCode = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K";

export type PackagingTier = "budget" | "standard" | "premium" | "flagship";

export interface Bucket {
  code: BucketCode;
  name: string;
  slug: string;
  purpose: string;
  primaryBuyer: string;
  description?: string;
  aspRangeMin?: number;
  aspRangeMax?: number;
  /** lucide-react icon name */
  icon?: string;
}

export interface Product {
  /** Stable id — we use the SKU. */
  id: string;
  sku: string;
  name: string;
  slug: string;
  bucket: BucketCode;
  tagline?: string;
  description: string;
  whoIsItFor?: string;
  insight?: string;
  wowScore?: number;
  leadTimeDays?: number;
  rushLeadTimeDays?: number;
  moq?: number;
  materials?: string[];
  personalizationTypes?: string[];
  occasions?: string[];
  archetypes?: string[];
  tags?: string[];
  recommendedPackaging?: PackagingTier;
  imageUrl?: string;
  /** Additional gallery image URLs (detail-page thumbnails). */
  galleryImages?: string[];
  isFeatured?: boolean;
  isBestseller?: boolean;
  isNew?: boolean;
  /**
   * INTERNAL ONLY — present for admin/quote tooling. Never rendered on public
   * pages. Omitted entirely from the public static data file.
   */
  basePrice?: number;
}
