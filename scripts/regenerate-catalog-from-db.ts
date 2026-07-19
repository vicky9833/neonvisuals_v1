/**
 * P11a — DB→static regenerate pipeline (the publish step P11b triggers).
 *
 * Reads the non-archived products' `public_payload` (the real 299) in `sort_order`, plus the
 * kitHeroImages singleton, and feeds them to the EXISTING pure serializers
 * (renderProductsFile / renderProductImagesFile from generate-catalog.ts) to reproduce
 * src/data/products.ts + src/data/product-images.ts DETERMINISTICALLY.
 *
 * Exported `regenerateFromDb` returns the two source strings (for the byte-identity equivalence
 * proof — does NOT write). `main()` (direct run: `npm run regenerate-catalog`) WRITES them to disk
 * (the P11b publish action). This phase only ever calls the exported fn for comparison.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderProductsFile, renderProductImagesFile } from "./generate-catalog";
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

export interface RegenOutput {
  productsSource: string;
  productImagesSource: string;
  productCount: number;
}

/** Read the real (non-archived, payload-bearing) catalog from the DB and render the static files. */
export async function regenerateFromDb(admin: SupabaseClient): Promise<RegenOutput> {
  const { data, error } = await admin
    .from("products")
    .select("public_payload, sort_order")
    .not("public_payload", "is", null)
    // P11b: only ACTIVE products are published. draft (newly created, not yet released) and
    // archived (soft-deleted) are both excluded. The P11a 299 are all active, so the byte-identity
    // invariant is preserved (this tightens `neq archived` → `eq active` with the same result set).
    .eq("status", "active")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(`products read failed: ${error.message}`);
  const products = (data ?? []).map((r) => r.public_payload as unknown as Product);

  const { data: kh, error: kErr } = await admin
    .from("system_settings")
    .select("settings")
    .eq("id", "catalog_kit_hero_images")
    .maybeSingle();
  if (kErr) throw new Error(`kitHeroImages read failed: ${kErr.message}`);
  const kitHeroImages = ((kh?.settings as { images?: string[] } | null)?.images ?? []) as string[];

  return {
    productsSource: renderProductsFile(products, kitHeroImages),
    productImagesSource: renderProductImagesFile(products),
    productCount: products.length,
  };
}

async function main(): Promise<void> {
  const { url, srk } = loadEnv();
  const admin = createClient(url, srk, { auth: { persistSession: false, autoRefreshToken: false } });
  const out = await regenerateFromDb(admin);
  writeFileSync(join(process.cwd(), "src", "data", "products.ts"), out.productsSource, "utf8");
  writeFileSync(join(process.cwd(), "src", "data", "product-images.ts"), out.productImagesSource, "utf8");
  console.log(`Regenerated static catalog from DB: ${out.productCount} products written.`);
}

// Only write to disk when executed DIRECTLY (the P11b publish action). Importing this module for the
// equivalence proof calls regenerateFromDb() and never writes the committed files.
const isDirect = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("regenerate-catalog-from-db.ts");
if (isDirect) {
  main().catch((err: unknown) => { console.error(err instanceof Error ? err.message : String(err)); process.exitCode = 1; });
}
