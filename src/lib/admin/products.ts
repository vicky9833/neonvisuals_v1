import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BucketCode, PackagingTier, Product } from "@/lib/types/product";

/**
 * Admin product catalog access (DB-backed).
 *
 * P11b: the DB is the catalog MASTER (P11a). Every write path patches
 * `public_payload` (the exact static `Product` per SKU — the regen source of
 * truth) ALONGSIDE the structured columns, so the DB→static regenerate step
 * stays byte-faithful. Pricing is INTERNAL (DB only) and never enters the
 * public payload. The public static file is published via the explicit publish
 * action (src/lib/admin/catalog-publish.ts) + a manual commit+deploy.
 */

const PRODUCT_IMAGES_BUCKET = "product-images";

/**
 * The three display sizes generated for every uploaded original. Mirrors
 * scripts/generate-variants.ts (VARIANTS) so admin-uploaded images flow through
 * the SAME variant convention the public surfaces resolve via `variantUrl`
 * (extension-preserving key: `<original>__<suffix>.webp`).
 */
const VARIANT_SIZES = [
  { suffix: "thumb", width: 200 },
  { suffix: "card", width: 600 },
  { suffix: "detail", width: 1200 },
] as const;
const VARIANT_WEBP_QUALITY = 80;

/**
 * Generate + upload the 3 WebP variants for a freshly-uploaded original, inline
 * and synchronous (no queue infra). Key convention is byte-compatible with
 * scripts/generate-variants.ts `variantKey()`.
 */
async function generateAndUploadVariants(
  supa: SupabaseClient,
  objectKey: string,
  bytes: ArrayBuffer,
): Promise<void> {
  // Lazy-load the native `sharp` addon at request time only. Keeping it out of the eager module
  // graph avoids initializing libvips in unrelated static-generation workers at build time.
  const sharp = (await import("sharp")).default;
  const input = Buffer.from(bytes);
  for (const { suffix, width } of VARIANT_SIZES) {
    const buffer = await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: VARIANT_WEBP_QUALITY })
      .toBuffer();
    const variantKey = `${objectKey}__${suffix}.webp`;
    const { error } = await supa.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(variantKey, buffer, { contentType: "image/webp", upsert: true });
    if (error) throw new Error(`variant ${suffix} upload failed: ${error.message}`);
  }
}

/** Best-effort removal of the 3 variant objects derived from an original object key. */
async function removeVariants(supa: SupabaseClient, objectKey: string): Promise<void> {
  const keys = VARIANT_SIZES.map((v) => `${objectKey}__${v.suffix}.webp`);
  await supa.storage.from(PRODUCT_IMAGES_BUCKET).remove(keys);
}

/** URL → object key within the product-images bucket (inverse of the public URL builder). */
function objectKeyFromPublicUrl(url: string): string | null {
  const marker = `/public/${PRODUCT_IMAGES_BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

/** Read the exact stored `public_payload` Product for a SKU (regen source of truth). */
async function readPayload(supa: SupabaseClient, sku: string): Promise<Product | null> {
  const { data, error } = await supa
    .from("products")
    .select("public_payload")
    .eq("sku", sku)
    .maybeSingle();
  if (error) throw new Error(`Read payload failed: ${error.message}`);
  const payload = (data?.public_payload ?? null) as Product | null;
  return payload;
}

/** Look up a bucket's letter code from its id (for payload.bucket sync). */
async function bucketCodeById(supa: SupabaseClient, bucketId: string): Promise<BucketCode | null> {
  const { data } = await supa.from("buckets").select("code").eq("id", bucketId).maybeSingle();
  return (data?.code as BucketCode | undefined) ?? null;
}

/** Slugify a product name into a URL-safe slug (matches the static catalog convention). */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Apply the PUBLIC subset of an admin edit onto the existing payload Product,
 * keeping it byte-faithful to the serializer. Pricing/cogs/margin are INTERNAL
 * and never touch the payload. Optional fields cleared to null/empty are
 * DELETED (the serializer omits undefined), and boolean flags follow the static
 * convention of "present only when true".
 */
function applyPayloadPatch(
  existing: Product,
  updates: AdminProductUpdate,
  bucketCode: BucketCode | null,
): Product {
  const p: Product = { ...existing };
  const setStr = (key: "tagline" | "whoIsItFor" | "insight", val: string | null | undefined) => {
    if (val === undefined) return;
    if (val === null || val.trim() === "") delete p[key];
    else p[key] = val;
  };
  const setNum = (key: "wowScore" | "leadTimeDays" | "moq", val: number | null | undefined) => {
    if (val === undefined) return;
    if (val === null) delete p[key];
    else p[key] = val;
  };
  const setFlag = (key: "isFeatured" | "isBestseller" | "isNew", val: boolean | undefined) => {
    if (val === undefined) return;
    if (val) p[key] = true;
    else delete p[key];
  };

  if (updates.name !== undefined) p.name = updates.name;
  setStr("tagline", updates.tagline);
  if (updates.description !== undefined) p.description = updates.description ?? "";
  setStr("whoIsItFor", updates.whoIsItFor);
  setStr("insight", updates.insight);
  if (updates.bucketId !== undefined && bucketCode) p.bucket = bucketCode;
  setNum("wowScore", updates.wowScore);
  setNum("leadTimeDays", updates.leadTimeDays);
  setNum("moq", updates.moq);
  if (updates.materials !== undefined) {
    if (updates.materials.length > 0) p.materials = updates.materials;
    else delete p.materials;
  }
  if (updates.tags !== undefined) {
    if (updates.tags.length > 0) p.tags = updates.tags;
    else delete p.tags;
  }
  if (updates.recommendedPackaging !== undefined) {
    if (updates.recommendedPackaging) p.recommendedPackaging = updates.recommendedPackaging as PackagingTier;
    else delete p.recommendedPackaging;
  }
  setFlag("isFeatured", updates.isFeatured);
  setFlag("isBestseller", updates.isBestseller);
  setFlag("isNew", updates.isNew);
  if (updates.thumbnailUrl !== undefined && updates.thumbnailUrl) p.imageUrl = updates.thumbnailUrl;
  return p;
}

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
  const columns: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    const col = map[key];
    if (col && value !== undefined) columns[col] = value;
  }

  // Auto-calculate margin when pricing changes.
  const cogs = updates.cogs;
  const price = updates.priceSingle;
  if (typeof cogs === "number" && typeof price === "number" && price > 0) {
    columns.margin_percent = Math.round(((price - cogs) / price) * 100);
  }

  // P11b payload-sync (ruling A): patch public_payload (the regen source of truth) with the PUBLIC
  // subset of the edit so a regenerate reflects it. Pricing/cogs/margin are INTERNAL and never enter
  // the payload — so a pricing-only edit leaves the payload (and thus the public catalog) untouched.
  const existingPayload = await readPayload(supa, sku);
  if (existingPayload) {
    const bucketCode = updates.bucketId ? await bucketCodeById(supa, updates.bucketId) : null;
    columns.public_payload = applyPayloadPatch(existingPayload, updates, bucketCode) as unknown as Record<string, unknown>;
  }

  if (Object.keys(columns).length > 0) {
    const { error } = await supa.from("products").update(columns).eq("sku", sku);
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

  // P11b (ruling D): generate the 3 WebP variants inline so admin uploads flow through the same
  // right-sized pipeline the public surfaces resolve (no full-size-only regression for new images).
  await generateAndUploadVariants(supa, path, bytes);

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const url = `${base}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${path}`;

  const product = await getAdminProduct(sku);
  const images = [...(product?.images ?? []), url];
  const isFirstImage = !product?.thumbnail_url;
  const patch: Record<string, unknown> = { images, gallery_images: images };
  if (isFirstImage) {
    patch.thumbnail_url = url;
    patch.image_url = url;
  }

  // P11b payload-sync: mirror onto public_payload (imageUrl + galleryImages) so a regenerate emits
  // the new image. galleryImages is authoritative for the public gallery; imageUrl is the hero.
  const existingPayload = await readPayload(supa, sku);
  if (existingPayload) {
    const gallery = [...(existingPayload.galleryImages ?? []), url];
    const patched: Product = { ...existingPayload, galleryImages: gallery };
    if (isFirstImage || !patched.imageUrl) patched.imageUrl = url;
    patch.public_payload = patched as unknown as Record<string, unknown>;
  }

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

  // Remove from storage (best effort - only if it's in our bucket) + its 3 variant objects.
  const objectKey = objectKeyFromPublicUrl(url);
  if (objectKey) {
    await supa.storage.from(PRODUCT_IMAGES_BUCKET).remove([objectKey]);
    await removeVariants(supa, objectKey);
  }

  const images = (product.images ?? []).filter((i) => i !== url);
  const patch: Record<string, unknown> = { images, gallery_images: images };
  const newThumb = product.thumbnail_url === url ? images[0] ?? null : undefined;
  if (newThumb !== undefined) {
    patch.thumbnail_url = newThumb;
    patch.image_url = newThumb;
  }

  // P11b payload-sync: mirror the removal onto public_payload.
  const existingPayload = await readPayload(supa, sku);
  if (existingPayload) {
    const gallery = (existingPayload.galleryImages ?? []).filter((i) => i !== url);
    const patched: Product = { ...existingPayload, galleryImages: gallery };
    if (existingPayload.imageUrl === url) {
      if (gallery[0]) patched.imageUrl = gallery[0];
      else delete patched.imageUrl;
    }
    patch.public_payload = patched as unknown as Record<string, unknown>;
  }

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

export interface AdminProductCreate {
  name: string;
  bucketId: string;
  tagline?: string | null;
  description?: string | null;
  whoIsItFor?: string | null;
  insight?: string | null;
  wowScore?: number | null;
  tags?: string[];
  materials?: string[];
  recommendedPackaging?: string | null;
}

/** Next `NV-<L>-<NNN>` SKU for a collection letter: max existing sequence + 1 (ruling E). */
async function nextSkuForLetter(supa: SupabaseClient, letter: BucketCode): Promise<string> {
  const { data, error } = await supa.from("products").select("sku").ilike("sku", `NV-${letter}-%`);
  if (error) throw new Error(`SKU scan failed: ${error.message}`);
  const re = new RegExp(`^NV-${letter}-(\\d{3,})$`);
  let max = 0;
  for (const r of data ?? []) {
    const m = re.exec(r.sku as string);
    if (m) {
      const n = Number.parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `NV-${letter}-${String(max + 1).padStart(3, "0")}`;
}

/** Dedupe a slug against the global-unique `products.slug` (append -2, -3, …). */
async function uniqueSlug(supa: SupabaseClient, base: string): Promise<string> {
  const root = base || "product";
  let slug = root;
  let n = 1;
  for (;;) {
    const { data } = await supa.from("products").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    n += 1;
    slug = `${root}-${n}`;
  }
}

/**
 * Create a new product (ruling E). SKU = next-per-bucket; slug deduped; the row gets structured
 * columns AND a well-formed `public_payload`; status defaults to `draft` so it is NOT published
 * (regen emits only `active`) until an admin activates + publishes. `platform.products.manage`.
 * The global-unique sku/slug constraints are the concurrency backstop (retry on violation).
 */
export async function createAdminProduct(input: AdminProductCreate): Promise<AdminProduct> {
  const supa = createAdminClient();
  const letter = await bucketCodeById(supa, input.bucketId);
  if (!letter) throw new Error("Invalid collection (bucket) id.");

  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");
  const baseSlug = slugify(name);

  const { data: maxRow } = await supa
    .from("products")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = ((maxRow?.sort_order as number | null) ?? 0) + 1;

  let lastErr = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const sku = await nextSkuForLetter(supa, letter);
    const slug = await uniqueSlug(supa, baseSlug);

    const payload: Product = {
      id: sku,
      sku,
      name,
      slug,
      bucket: letter,
      description: (input.description ?? "").trim(),
    };
    if (input.tagline && input.tagline.trim()) payload.tagline = input.tagline.trim();
    if (input.whoIsItFor && input.whoIsItFor.trim()) payload.whoIsItFor = input.whoIsItFor.trim();
    if (input.insight && input.insight.trim()) payload.insight = input.insight.trim();
    if (typeof input.wowScore === "number") payload.wowScore = input.wowScore;
    if (input.tags && input.tags.length > 0) payload.tags = input.tags;
    if (input.materials && input.materials.length > 0) payload.materials = input.materials;
    if (input.recommendedPackaging) payload.recommendedPackaging = input.recommendedPackaging as PackagingTier;

    const row = {
      sku,
      name,
      slug,
      bucket_id: input.bucketId,
      description: payload.description,
      tagline: payload.tagline ?? null,
      who_is_it_for: payload.whoIsItFor ?? null,
      insight: payload.insight ?? null,
      wow_score: input.wowScore ?? null,
      tags: input.tags ?? null,
      materials: input.materials ?? null,
      recommended_packaging: input.recommendedPackaging ?? null,
      status: "draft",
      sort_order: sortOrder,
      public_payload: payload as unknown as Record<string, unknown>,
    };

    const { error } = await supa.from("products").insert(row);
    if (!error) {
      const created = await getAdminProduct(sku);
      if (!created) throw new Error("Created product not found");
      return created;
    }
    if (!/duplicate key|unique/i.test(error.message)) {
      throw new Error(`Create product failed: ${error.message}`);
    }
    lastErr = error.message; // unique backstop hit → recompute next SKU/slug and retry
  }
  throw new Error(`Create product failed after retries: ${lastErr}`);
}
