/**
 * P11a — one-time (idempotent) import of the REAL static catalog into the DB as master.
 *
 * Reads the committed public catalog (src/data/products.ts: the 299 real Product objects +
 * kitHeroImages) and, per SKU, upserts a products row storing the EXACT Product in
 * `public_payload` (verbatim — the regen source of truth) AND populating the structured columns
 * the DB already has (for P11b admin use). kitHeroImages → system_settings singleton.
 * Finally archives the stale seed (rows with no payload). Re-run = same state.
 *
 * Run: `npm run import-catalog`.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { PRODUCTS, kitHeroImages } from "../src/data/products";
import type { Product } from "../src/lib/types/product";

function loadEnv(): { url: string; srk: string } {
  const raw = readFileSync(".env.local", "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, "");
  }
  return { url: env.NEXT_PUBLIC_SUPABASE_URL, srk: env.SUPABASE_SERVICE_ROLE_KEY };
}

const UPSERT_BATCH = 50;

const STALE_PREFIX = "zzz_stale_";

export async function importCatalog(admin: SupabaseClient): Promise<{ imported: number; archived: number }> {
  // STEP 0 — neutralize the stale seed BEFORE importing the real catalog.
  // `products` has a GLOBAL unique constraint on slug (and sku); the stale seed shares some slugs
  // with the real catalog, so archiving-by-status alone cannot free those keys. We preserve every
  // stale row (deprecate-don't-destroy; zero refs confirmed) but archive it AND namespace its sku/slug
  // with `zzz_stale_` so the real 299 can claim the natural keys. Idempotent (skips already-namespaced).
  const { data: staleRows, error: staleErr } = await admin
    .from("products")
    .select("id, sku, slug")
    .is("public_payload", null)
    .not("sku", "like", `${STALE_PREFIX}%`);
  if (staleErr) throw new Error(`stale read failed: ${staleErr.message}`);
  for (const r of staleRows ?? []) {
    const { error } = await admin
      .from("products")
      .update({ status: "archived", sku: `${STALE_PREFIX}${r.sku}`, slug: `${STALE_PREFIX}${r.slug}` })
      .eq("id", r.id as string);
    if (error) throw new Error(`stale neutralize failed for ${r.sku}: ${error.message}`);
  }

  // bucket letter → id
  const { data: buckets, error: bErr } = await admin.from("buckets").select("id, code");
  if (bErr) throw new Error(`buckets read failed: ${bErr.message}`);
  const bucketId = new Map<string, string>((buckets ?? []).map((b) => [b.code as string, b.id as string]));

  const rows = PRODUCTS.map((p: Product, idx: number) => ({
    sku: p.sku,
    name: p.name,
    slug: p.slug,
    bucket_id: bucketId.get(p.bucket) ?? null,
    tags: p.tags ?? null,
    image_url: p.imageUrl ?? null,
    thumbnail_url: p.imageUrl ?? null,
    gallery_images: p.galleryImages ?? null,
    images: p.galleryImages ?? null,
    status: "active",
    sort_order: idx,
    public_payload: p as unknown as Record<string, unknown>,
  }));

  let imported = 0;
  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const batch = rows.slice(i, i + UPSERT_BATCH);
    const { error } = await admin.from("products").upsert(batch, { onConflict: "sku" });
    if (error) throw new Error(`products upsert failed at ${i}: ${error.message}`);
    imported += batch.length;
  }

  // kitHeroImages singleton (top-level export of products.ts) → system_settings.
  const { error: sErr } = await admin
    .from("system_settings")
    .upsert({ id: "catalog_kit_hero_images", settings: { images: kitHeroImages } }, { onConflict: "id" });
  if (sErr) throw new Error(`kitHeroImages settings upsert failed: ${sErr.message}`);

  // Safety net: any remaining payload-less row is archived (stale seed already handled in STEP 0).
  await admin.from("products").update({ status: "archived" }).is("public_payload", null).neq("status", "archived");

  return { imported, archived: (staleRows ?? []).length };
}

async function main(): Promise<void> {
  const { url, srk } = loadEnv();
  const admin = createClient(url, srk, { auth: { persistSession: false, autoRefreshToken: false } });
  console.log(`Importing ${PRODUCTS.length} products + ${kitHeroImages.length} kit hero images…`);
  const res = await importCatalog(admin);
  console.log(`Done. imported=${res.imported}, stale archived this run=${res.archived}.`);
}

main().catch((err: unknown) => { console.error(err instanceof Error ? err.message : String(err)); process.exitCode = 1; });
