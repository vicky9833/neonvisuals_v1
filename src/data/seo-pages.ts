/**
 * Programmatic SEO landing pages (occasion × city, gift guides, etc.).
 * Populated in a dedicated SEO task; consumed by sitemap generation.
 */
export interface SeoPage {
  slug: string;
  title: string;
  description: string;
  /** Optional grouping, e.g. "occasion", "city", "guide". */
  kind?: string;
}

export const SEO_PAGES: readonly SeoPage[] = [];
