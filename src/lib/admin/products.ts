import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Admin product catalog access (DB-backed). NOTE: this updates the `products`
 * DATABASE rows only — the public static file `src/data/products.ts` remains
 * the source of truth for the public site and is regenerated manually when
 * needed (export DB rows → products.ts). Pricing lives only in the DB.
 */

const PRODUCT_IMAGES_BUCKET = "product-images";

export interface AdminProductRow {
  id: string;
  sku: string;
  name: string;
  tagline: string | null;
  collection_code: string | null;
  collection_name: string | null;
  wow_score: number | null;
  images: string[];
  thumbnail_url: string | null;
  price_single: number | null;
  status: string;
}

export interface AdminProduct {
  id: string;
  sku: string;
  bucket_id: string | null;
  name: string;
  tagline: string | null;
  description: string | null;
  long_description: string | null;
  who_is_it_for: string | null;
  insight: string | null;
  wow_score: number | null;
  cogs: number | null;
  price_single: number | null;
  price_bulk_25: number | null;
  price_bulk_100: number | null;
  margin_percent: number | null;
  lead_time_days: number | null;
  moq: number | null;
  materials: string[] | null;
  tags: string[] | null;
  recommended_packaging: string | null;
  images: string[];
  thumbnail_url: string | null;
  status: string;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  collection_code: string | null;
  collection_name: string | null;
}

export interface BucketOption {
  id: string;
  code: string;
  name: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRow(row: any): AdminProductRow {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    tagline: row.tagline ?? null,
    collection_code: row.buckets?.code ?? null,
    collection_name: row.buckets?.name ?? null,
    wow_score: row.wow_score ?? null,
    images: (row.images ?? []) as string[],
    thumbnail_url: row.thumbnail_url ?? row.image_url ?? null,
    price_single: row.price_single ?? null,
    status: row.status ?? "active",
  };
}

function mapFull(row: any): AdminProduct {
  return {
    id: row.id,
    sku: row.sku,
    bucket_id: row.bucket_id ?? null,
    name: row.name,
    tagline: row.tagline ?? null,
    description: row.description ?? null,
    long_description: row.long_description ?? null,
    who_is_it_for: row.who_is_it_for ?? null,
    insight: row.insight ?? null,
    wow_score: row.wow_score ?? null,
    cogs: row.cogs ?? null,
    price_single: row.price_single ?? null,
    price_bulk_25: row.price_bulk_25 ?? null,
    price_bulk_100: row.price_bulk_100 ?? null,
    margin_percent: row.margin_percent ?? null,
    lead_time_days: row.lead_time_days ?? null,
    moq: row.moq ?? null,
    materials: row.materials ?? null,
    tags: row.tags ?? null,
    recommended_packaging: row.recommended_packaging ?? null,
    images: (row.images ?? []) as string[],
    thumbnail_url: row.thumbnail_url ?? row.image_url ?? null,
    status: row.status ?? "active",
    is_featured: Boolean(row.is_featured),
    is_bestseller: Boolean(row.is_bestseller),
    is_new: Boolean(row.is_new),
    collection_code: row.buckets?.code ?? null,
    collection_name: row.buckets?.name ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function listAdminProducts(): Promise<AdminProductRow[]> {
  const supa = createAdminClient();
  const { data, error } = await supa
    .from("products")
    .select(
      "id, sku, name, tagline, wow_score, images, thumbnail_url, image_url, price_single, status, buckets(code, name)",
    )
    .order("sku", { ascending: true });
  if (error) throw new Error(`List products failed: ${error.message}`);
  return (data ?? []).map(mapRow);
}

export async function getAdminProduct(sku: string): Promise<AdminProduct | null> {
  const supa = createAdminClient();
  const { data, error } = await supa
    .from("products")
    .select("*, buckets(code, name)")
    .eq("sku", sku)
    .maybeSingle();
  if (error) throw new Error(`Get product failed: ${error.message}`);
  return data ? mapFull(data) : null;
}

export interface AdminProductUpdate {
  name?: string;
  tagline?: string | null;
  description?: string | null;
  longDescription?: string | null;
  whoIsItFor?: string | null;
  insight?: string | null;
  bucketId?: string | null;
  wowScore?: number | null;
  cogs?: number | null;
  priceSingle?: number | null;
  priceBulk25?: number | null;
  priceBulk100?: number | null;
  leadTimeDays?: number | null;
  moq?: number | null;
  materials?: string[];
  tags?: string[];
  recommendedPackaging?: string | null;
  status?: string;
  isFeatured?: boolean;
  isBestseller?: boolean;
  isNew?: boolean;
  thumbnailUrl?: string | null;
}

export async function updateAdminProduct(
  sku: string,
  updates: AdminProductUpdate,
): Promise<AdminProduct> {
  const supa = createAdminClient();
  const map: Record<string, string> = {
    name: "name",
    tagline: "tagline",
    description: "description",
    longDescription: "long_description",
    whoIsItFor: "who_is_it_for",
    insight: "insight",
    bucketId: "bucket_id",
    wowScore: "wow_score",
    cogs: "cogs",
    priceSingle: "price_single",
    priceBulk25: "price_bulk_25",
    priceBulk100: "price_bulk_100",
    leadTimeDays: "lead_time_days",
    moq: "moq",
    materials: "materials",
    tags: "tags",
    recommendedPackaging: "recommended_packaging",
    status: "status",
    isFeatured: "is_featured",
    isBestseller: "is_bestseller",
    isNew: "is_new",
    thumbnailUrl: "thumbnail_url",
  };
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    const col = map[key];
    if (col && value !== undefined) payload[col] = value;
  }

  // Auto-calculate margin when pricing changes.
  const cogs = updates.cogs;
  const price = updates.priceSingle;
  if (typeof cogs === "number" && typeof price === "number" && price > 0) {
    payload.margin_percent = Math.round(((price - cogs) / price) * 100);
  }

  if (Object.keys(payload).length > 0) {
    const { error } = await supa.from("products").update(payload).eq("sku", sku);
    if (error) throw new Error(`Update product failed: ${error.message}`);
  }
  const product = await getAdminProduct(sku);
  if (!product) throw new Error("Product not found");
  return product;
}

export async function listBuckets(): Promise<BucketOption[]> {
  const supa = createAdminClient();
  const { data, error } = await supa
    .from("buckets")
    .select("id, code, name")
    .order("code", { ascending: true });
  if (error) throw new Error(`List buckets failed: ${error.message}`);
  return (data ?? []).map((b) => ({
    id: b.id as string,
    code: b.code as string,
    name: b.name as string,
  }));
}

export interface ProductAdminStats {
  total: number;
  withImages: number;
  withoutImages: number;
  withPricing: number;
}

export async function getProductAdminStats(): Promise<ProductAdminStats> {
  const rows = await listAdminProducts();
  const withImages = rows.filter((r) => r.images.length > 0).length;
  const withPricing = rows.filter((r) => (r.price_single ?? 0) > 0).length;
  return {
    total: rows.length,
    withImages,
    withoutImages: rows.length - withImages,
    withPricing,
  };
}

export async function addProductImage(
  sku: string,
  fileName: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<AdminProduct> {
  const supa = createAdminClient();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${sku}/${Date.now()}_${safeName}`;
  const { error: uploadErr } = await supa.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, bytes, { contentType, upsert: true });
  if (uploadErr) throw new Error(`Image upload failed: ${uploadErr.message}`);

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const url = `${base}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${path}`;

  const product = await getAdminProduct(sku);
  const images = [...(product?.images ?? []), url];
  const patch: Record<string, unknown> = { images };
  if (!product?.thumbnail_url) patch.thumbnail_url = url;
  await supa.from("products").update(patch).eq("sku", sku);

  const updated = await getAdminProduct(sku);
  if (!updated) throw new Error("Product not found");
  return updated;
}

export async function removeProductImage(
  sku: string,
  url: string,
): Promise<AdminProduct> {
  const supa = createAdminClient();
  const product = await getAdminProduct(sku);
  if (!product) throw new Error("Product not found");

  // Remove from storage (best effort — only if it's in our bucket).
  const marker = `/public/${PRODUCT_IMAGES_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx !== -1) {
    const path = url.slice(idx + marker.length);
    await supa.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
  }

  const images = (product.images ?? []).filter((i) => i !== url);
  const patch: Record<string, unknown> = { images };
  if (product.thumbnail_url === url) patch.thumbnail_url = images[0] ?? null;
  await supa.from("products").update(patch).eq("sku", sku);

  const updated = await getAdminProduct(sku);
  if (!updated) throw new Error("Product not found");
  return updated;
}

export interface CollectionAdminData {
  id: string;
  code: string;
  name: string;
  slug: string;
  productCount: number;
  withImages: number;
  aspMin: number | null;
  aspMax: number | null;
  avgMargin: number;
}

export async function getCollectionAdminData(): Promise<CollectionAdminData[]> {
  const supa = createAdminClient();
  const [{ data: buckets }, { data: products }] = await Promise.all([
    supa
      .from("buckets")
      .select("id, code, name, slug, asp_range_min, asp_range_max")
      .order("code", { ascending: true }),
    supa.from("products").select("bucket_id, images, margin_percent"),
  ]);

  const byBucket = new Map<
    string,
    { count: number; withImages: number; marginSum: number; marginCount: number }
  >();
  for (const p of products ?? []) {
    const id = p.bucket_id as string | null;
    if (!id) continue;
    const agg = byBucket.get(id) ?? {
      count: 0,
      withImages: 0,
      marginSum: 0,
      marginCount: 0,
    };
    agg.count += 1;
    if (((p.images as string[] | null) ?? []).length > 0) agg.withImages += 1;
    if (p.margin_percent != null) {
      agg.marginSum += Number(p.margin_percent);
      agg.marginCount += 1;
    }
    byBucket.set(id, agg);
  }

  return (buckets ?? []).map((b) => {
    const agg = byBucket.get(b.id as string);
    return {
      id: b.id as string,
      code: b.code as string,
      name: b.name as string,
      slug: b.slug as string,
      productCount: agg?.count ?? 0,
      withImages: agg?.withImages ?? 0,
      aspMin: (b.asp_range_min as number) ?? null,
      aspMax: (b.asp_range_max as number) ?? null,
      avgMargin: agg && agg.marginCount > 0 ? Math.round(agg.marginSum / agg.marginCount) : 0,
    };
  });
}
