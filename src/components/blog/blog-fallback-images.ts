/**
 * Diverse product-photo fallbacks for blog cards / hero images.
 *
 * When a post has no `hero_image_url` (or it fails to load), we show a real,
 * premium catalogue photo instead of the gift-icon placeholder. The array is
 * ordered so a post's list position maps to a topically-relevant product, and
 * every entry is a verified path in the Supabase `product-images` bucket
 * (paths cross-checked against src/data/product-images.ts).
 */

const STORAGE_BASE =
  "https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images";

/**
 * One product photo per blog topic bucket. Index meaning:
 *  0 Diwali/Seasonal · 1 Corporate/Cost · 2 Onboarding · 3 Recognition ·
 *  4 Culture · 5 Moradabad/Copper · 6 Sustainability · 7 Personalisation ·
 *  8 Client · 9 Events · 10 Tech · 11 General fallback.
 */
export const BLOG_FALLBACK_IMAGES: readonly string[] = [
  `${STORAGE_BASE}/festive/diwali-brass-diya-set/brass-diya-set/brass-diya1.jpeg`,
  `${STORAGE_BASE}/ceo-leadership/leather-embossed-portfolio/leather-embossed-portfolio-set1/leather-embossed-portfolio1.jpg`,
  `${STORAGE_BASE}/onboarding/backpack/classic-30l-laptop-backpack/classic-30-l-laptop-backpack-1.png`,
  `${STORAGE_BASE}/ceo-leadership/crystal-star-trophy-3d-leaser/crystal-star-trophy/crystal-star-trophy1.jpeg`,
  `${STORAGE_BASE}/college/tote-bag/name-and-logo-tote-bag/totebag.jpeg`,
  `${STORAGE_BASE}/onboarding/copper-bottle/copper-bottletumbler/copper-bottle-with-tumbler-1.png`,
  `${STORAGE_BASE}/sustainability/engraved-bamboo-desk-organiser/bamboo-desk-organiser-set-1/bamboo-desk-organsier-1.jpg`,
  `${STORAGE_BASE}/onboarding/pen/name-written-pen/name-pen-1.webp`,
  `${STORAGE_BASE}/client/artisnal-tea-or-coffe-set/artisnal-tea-set-1/tea-set-1.avif`,
  `${STORAGE_BASE}/events/cap/cap-set1/customised-cap-1.webp`,
  `${STORAGE_BASE}/tech-forward/tech-and-digital-forward/digital-memory-archieve-stand.png`,
  `${STORAGE_BASE}/onboarding/hoodie/basic-hoodie/hoodie-with-logo-1.png`,
  `${STORAGE_BASE}/onboarding/diary/leather-diary/leather-diary-1.webp`,
  `${STORAGE_BASE}/ceo-leadership/marble-trophy-brass-plate/marble-t1.jpeg`,
  `${STORAGE_BASE}/ceo-leadership/brass-desk-globe-name-base/brass-desk-globe-name-base-1.jpeg`,
  `${STORAGE_BASE}/sustainability/organic-soy-candle-named-tin/organic-soy-candle-named-tin-set-1/floral-soy-candle-favors-1.webp`,
  `${STORAGE_BASE}/onboarding/copper-bottle/hammered-copper-bottle/hammered-copper-bottle-1.png`,
  `${STORAGE_BASE}/client/artisnal-tea-or-coffe-set/artisnal-tea-set-2/floral-tea-set-1.jpg`,
] as const;

/**
 * Pick a fallback image. Prefer passing the post SLUG (a string): the slug is
 * hashed to a stable, well-distributed index so every post keeps a unique,
 * consistent image across renders. A numeric list index is also accepted as a
 * fallback for callers that only have a position.
 */
export function blogFallbackImage(slugOrIndex: string | number): string {
  const n = BLOG_FALLBACK_IMAGES.length;
  if (typeof slugOrIndex === "number") {
    return BLOG_FALLBACK_IMAGES[((slugOrIndex % n) + n) % n];
  }
  // Hash the slug to a stable, distributed index.
  let hash = 0;
  for (let i = 0; i < slugOrIndex.length; i += 1) {
    hash = ((hash << 5) - hash + slugOrIndex.charCodeAt(i)) | 0;
  }
  return BLOG_FALLBACK_IMAGES[Math.abs(hash) % n];
}

/**
 * Derive a stable, well-distributed index from a slug, so a single post with
 * no list position (e.g. the detail page hero) still gets a varied fallback.
 */
export function slugFallbackIndex(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return hash;
}
