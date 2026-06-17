/**
 * Catalog helpers — pure functions over the static no-price data layer
 * (src/data/products.ts + src/data/buckets.ts). No Supabase / DB calls.
 *
 * Brand voice: "Collection" (not Bucket), "Enquire" (not Buy). Prices are
 * NEVER referenced here.
 */
import { PRODUCTS as RAW_PRODUCTS } from "@/data/products";
import { BUCKETS } from "@/data/buckets";
import { PRODUCT_IMAGES } from "@/data/product-images";
import type { Bucket, BucketCode, Product } from "@/lib/types/product";
import { WHATSAPP_NUMBER } from "@/lib/utils/constants";

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

/** Products in a collection, preserving the data-file order (sort_order). */
export function getProductsByCode(code: BucketCode): Product[] {
  return PRODUCTS.filter((p) => p.bucket === code);
}

export function getCollectionProductCount(code: BucketCode): number {
  return getProductsByCode(code).length;
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

/** Common tag filters surfaced on the catalog page. value = raw tag token. */
export const TAG_FILTERS: { label: string; value: string }[] = [
  { label: "Desk Test ✓", value: "desk-test" },
  { label: "Trending", value: "trending" },
  { label: "Eco-Friendly", value: "eco-friendly" },
  { label: "Tech", value: "tech" },
  { label: "Apparel", value: "apparel" },
  { label: "Instagram-Inspired", value: "instagram-inspired" },
  { label: "Premium", value: "premium" },
  { label: "Keepsake", value: "keepsake" },
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
