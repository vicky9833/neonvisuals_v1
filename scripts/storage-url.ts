/**
 * Storage URL helpers for the image & catalogue rebuild pipeline.
 *
 * This module is the single source of truth for the Supabase public storage
 * base URL and the URL-construction helper used to turn a relative storage
 * path (an object key inside the `product-images` bucket) into a fully-qualified
 * public URL.
 *
 * It is reused in two places (task 9.1, design §"URL construction"):
 *   1. `scripts/generate-catalog.ts` imports it to build every product/image
 *      URL at generation time from the slugified relative paths in the manifest.
 *   2. The emitted data files (`src/data/products.ts`,
 *      `src/data/product-images.ts`) carry the identical `STORAGE_BASE` /
 *      `img` definitions so the two never drift.
 *
 * Keeping the canonical definition here guarantees every generated URL begins
 * with `${STORAGE_BASE}/` followed by the slugified relative path (Req 13.1,
 * 13.4, 16.4) and can never reproduce the pre-rebuild SKU-folder layout
 * (Req 24.5), because the relative path comes straight from the rebuilt tree.
 */

/**
 * The Supabase public storage base for the `product-images` bucket
 * (project ref `xserhblhiwtmaiejbvgo`, Mumbai region).
 *
 * It has NO trailing slash: the trailing slash is added by {@link img} so that
 * joining a relative path never produces a double slash (Requirement 13.1).
 */
export const STORAGE_BASE =
  "https://xserhblhiwtmaiejbvgo.supabase.co/storage/v1/object/public/product-images";

/**
 * Join {@link STORAGE_BASE} with a relative storage path (object key).
 *
 * Contract (Requirement 13.1, 13.4, 16.4):
 *   - Leading slashes on `path` are stripped so the join never yields a double
 *     slash after the bucket segment.
 *   - Exactly one `/` separates the base from the relative path.
 *   - The relative path is otherwise used verbatim (it is already slugified by
 *     the restructure step), so the result begins with `${STORAGE_BASE}/`.
 *
 * @param path relative storage path within the bucket, e.g.
 *             `onboarding/engraved-copper-bottle/set-1/image-1.webp`.
 * @returns the fully-qualified public URL.
 */
export function img(path: string): string {
  return `${STORAGE_BASE}/${path.replace(/^\/+/, "")}`;
}
