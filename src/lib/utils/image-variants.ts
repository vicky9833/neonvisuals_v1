/**
 * Client/server-safe resolver for pre-generated `product-images` WebP variants.
 *
 * The upload pipeline (`scripts/generate-variants.ts`) writes three right-sized
 * WebP variants alongside every original, using a deterministic path convention:
 *
 *   .../img-1.png  →  .../img-1.png__thumb.webp   (~200w — tiny surfaces)
 *                     .../img-1.png__card.webp    (~600w — cards, tiles, blog)
 *                     .../img-1.png__detail.webp  (~1200w — gallery, hero)
 *
 * The original extension is PRESERVED in the key (P10a collision-fix).
 *
 * {@link variantUrl} derives the variant URL for a display size purely from the
 * original URL — no network call, no catalogue change. Surfaces MUST pair it
 * with an `onError` fallback to the original (see {@link originalOnError}) so a
 * missing variant degrades to the full image instead of a broken tile.
 *
 * Pure functions only; safe to import from Server and Client Components alike.
 */

/** The three generated display sizes. */
export type VariantSize = "thumb" | "card" | "detail";

/**
 * Derive the variant URL for `size` from an original image URL.
 *
 * Only rewrites URLs that carry a known raster extension; anything else
 * (already a variant, an unknown extension, a data/blob URL) is returned
 * unchanged so callers can pass any src through safely.
 *
 * @param originalUrl  Full public URL of the original image.
 * @param size         Target display size.
 * @returns            The derived `__<size>.webp` URL, or `originalUrl` when it
 *                     is not a rewritable original.
 */
export function variantUrl(originalUrl: string, size: VariantSize): string {
  if (!originalUrl) return originalUrl;
  // Already a generated variant — leave as-is (never double-suffix).
  if (/__(?:thumb|card|detail)\.webp$/i.test(originalUrl)) return originalUrl;

  // Only rewrite known raster originals.
  if (!/\.(png|jpe?g|webp|avif)$/i.test(originalUrl)) return originalUrl;

  // P10a collision-fix: PRESERVE the original extension in the key
  // (`x.png` → `x.png__card.webp`), so `x.png` and `x.avif` in the same folder
  // no longer collapse onto one variant key.
  return `${originalUrl}__${size}.webp`;
}

/**
 * Recover the original URL from a variant URL (inverse of {@link variantUrl}
 * for the extension swap). If `variant` is not a generated variant it is
 * returned unchanged. The recovered original always uses `.png` when the source
 * extension is unknown is NOT assumed — instead the caller should keep the
 * known original around; this helper is a best-effort for the `onError` path
 * where the element only knows its current (variant) src.
 *
 * Because the original extension is not encoded in the variant name, prefer
 * {@link originalOnError} with the known original URL when available.
 */
export function stripVariant(variant: string): string | null {
  // Extension-preserving keys make this the exact inverse: `x.png__card.webp` → `x.png`.
  const m = /^(.*)__(?:thumb|card|detail)\.webp$/i.exec(variant);
  return m ? m[1] : null;
}

/**
 * Build an `onError` handler that swaps a failed variant `<img>` back to its
 * known original URL exactly once (guards against an infinite error loop when
 * the original itself is missing).
 *
 * @param originalUrl  The known-good original URL to fall back to.
 */
export function originalOnError(
  originalUrl: string,
): (event: { currentTarget: HTMLImageElement }) => void {
  return (event) => {
    const el = event.currentTarget;
    if (el.dataset.fellBack === "true") return;
    if (el.src === originalUrl) return;
    el.dataset.fellBack = "true";
    el.src = originalUrl;
  };
}
