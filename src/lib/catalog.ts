/**
 * Catalog helpers - pure functions over the static no-price data layer
 * (src/data/products.ts + src/data/buckets.ts). No Supabase / DB calls.
 *
 * Brand voice: "Collection" (not Bucket), "Enquire" (not Buy). Prices are
 * NEVER referenced here.
 */
import { PRODUCTS as RAW_PRODUCTS } from "@/data/products";
import * as PRODUCTS_DATA from "@/data/products";
import { BUCKETS } from "@/data/buckets";
import { PRODUCT_IMAGES } from "@/data/product-images";
import type { Bucket, BucketCode, Product } from "@/lib/types/product";
import { WHATSAPP_NUMBER } from "@/lib/utils/constants";

/**
 * Kit hero images (from `ALL KITS` + `EXPERIENCE KITS`) used as the fallback
 * representative image for collections that have no product image yet.
 *
 * Read defensively: `products.ts` exports `kitHeroImages` once the catalogue is
 * regenerated, but this stays build-safe (empty fallback) until then.
 */
const KIT_HERO_IMAGES: readonly string[] = Array.isArray(
  (PRODUCTS_DATA as { kitHeroImages?: unknown }).kitHeroImages,
)
  ? ((PRODUCTS_DATA as { kitHeroImages?: string[] }).kitHeroImages ?? [])
  : [];

/**
 * Catalogue enriched with Supabase Storage image URLs (from product-images.ts).
 * Products without uploaded images keep imageUrl undefined → branded placeholder.
 */
export const PRODUCTS: Product[] = RAW_PRODUCTS.map((p) => {
  const imgs = PRODUCT_IMAGES[p.sku];
  return imgs
    ? { ...p, imageUrl: imgs.imageUrl, galleryImages: imgs.galleryImages }
    : p;
});

export { BUCKETS };

/** A collection (bucket) joined with its product list + count. */
export interface CollectionWithProducts extends Bucket {
  products: Product[];
  productCount: number;
}

export function getBucketBySlug(slug: string): Bucket | undefined {
  return BUCKETS.find((b) => b.slug === slug);
}

export function getBucketByCode(code: BucketCode): Bucket | undefined {
  return BUCKETS.find((b) => b.code === code);
}

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getProductBySku(sku: string): Product | undefined {
  return PRODUCTS.find((p) => p.sku === sku);
}

/** Products in a collection, preserving the data-file order (sort_order). */
export function getProductsByCode(code: BucketCode): Product[] {
  return PRODUCTS.filter((p) => p.bucket === code);
}

export function getCollectionProductCount(code: BucketCode): number {
  return getProductsByCode(code).length;
}

/**
 * Pure resolution rule for a collection's representative image (Req 17.5, 15.1).
 *
 * Given a product list, the kit-hero fallback list and a collection code, the
 * representative image is:
 *   1. the `imageUrl` of the collection's first product that has an image
 *      (data-file order preserved), else
 *   2. the first `kitHeroImages` entry, else
 *   3. `undefined` (caller renders the branded placeholder).
 *
 * Kept as a standalone pure function so it can be property-tested against
 * synthetic inputs without coupling to the committed data files. All catalogue
 * image URLs are built via `img()` on {@link STORAGE_BASE}, so a defined result
 * always begins with the storage base.
 */
export function resolveRepresentativeImage(
  products: readonly Product[],
  kitHeroImages: readonly string[],
  code: BucketCode,
): string | undefined {
  const firstWithImage = products.find(
    (p) => p.bucket === code && Boolean(p.imageUrl),
  );
  return firstWithImage?.imageUrl ?? kitHeroImages[0];
}

/**
 * Representative image for a collection (Req 17.5): the image of the
 * collection's first product, falling back to a kit hero image when the
 * collection has no product image. Returns `undefined` when neither exists so
 * callers can render the branded placeholder.
 */
export function getCollectionRepresentativeImage(
  code: BucketCode,
): string | undefined {
  return resolveRepresentativeImage(PRODUCTS, KIT_HERO_IMAGES, code);
}

/** A collection joined with its resolved representative image (Req 17.5). */
export function getBucketWithImage(
  code: BucketCode,
): (Bucket & { representativeImage?: string }) | undefined {
  const bucket = getBucketByCode(code);
  if (!bucket) return undefined;
  return { ...bucket, representativeImage: getCollectionRepresentativeImage(code) };
}

/** Related-collection map (spec: A↔F, B↔C, D↔H, E↔C, G↔I, J↔A, K standalone). */
const RELATED: Record<BucketCode, BucketCode[]> = {
  A: ["F", "J", "B"],
  B: ["C", "A", "F"],
  C: ["B", "E", "A"],
  D: ["H", "I", "F"],
  E: ["C", "B", "A"],
  F: ["A", "B", "D"],
  G: ["I", "B", "C"],
  H: ["D", "I", "A"],
  I: ["G", "D", "J"],
  J: ["A", "I", "H"],
  K: ["A", "E", "C"],
};

export function getRelatedBuckets(code: BucketCode, count = 3): Bucket[] {
  return (RELATED[code] ?? [])
    .map((c) => getBucketByCode(c))
    .filter((b): b is Bucket => Boolean(b))
    .slice(0, count);
}

/** Up to `count` other products, preferring the same collection then related. */
export function getRelatedProducts(product: Product, count = 4): Product[] {
  const sameCollection = getProductsByCode(product.bucket).filter(
    (p) => p.sku !== product.sku,
  );
  const out = [...sameCollection];
  if (out.length < count) {
    for (const b of getRelatedBuckets(product.bucket)) {
      for (const p of getProductsByCode(b.code)) {
        if (p.sku !== product.sku && !out.some((x) => x.sku === p.sku)) out.push(p);
        if (out.length >= count) break;
      }
      if (out.length >= count) break;
    }
  }
  return out.slice(0, count);
}

/** Case-insensitive substring search across name, tagline, description, tags. */
export function searchProducts(query: string, products: Product[] = PRODUCTS): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  return products.filter((p) => {
    const bucket = getBucketByCode(p.bucket);
    const haystack = [
      p.name,
      p.tagline ?? "",
      p.description,
      (p.tags ?? []).join(" "),
      bucket?.name ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

/**
 * Controlled tag vocabulary surfaced on the catalog page. `value` MUST equal the
 * exact tag string stored on products (product filtering matches
 * `(p.tags ?? []).includes(t)`), so label === value here.
 */
export const TAG_FILTERS: { label: string; value: string }[] = [
  { label: "Personalizable", value: "Personalizable" },
  { label: "Best Seller", value: "Best Seller" },
  { label: "Premium", value: "Premium" },
  { label: "Eco Friendly", value: "Eco Friendly" },
  { label: "Made in India", value: "Made in India" },
  { label: "Employee Favourite", value: "Employee Favourite" },
  { label: "New", value: "New" },
  { label: "Limited Edition", value: "Limited Edition" },
];

/** Build a WhatsApp enquiry URL with pre-filled context. */
export function waEnquiry(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function waProduct(product: Product, collectionName: string): string {
  return waEnquiry(
    `Hi, I'm interested in ${product.name} (SKU: ${product.sku}) from the ${collectionName} collection. Can you share pricing and customisation details?`,
  );
}

export function waCollection(collectionName: string): string {
  return waEnquiry(
    `Hi, I'm interested in the ${collectionName} collection. Can you share the catalog?`,
  );
}
