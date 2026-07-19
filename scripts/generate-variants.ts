/**
 * Image variant generator for the `product-images` bucket.
 *
 * The public catalogue serves original images (PNG/JPG/WEBP/AVIF) at their full
 * byte weight on every surface — a 48px thumbnail can pull a multi-MB original.
 * This script generates three right-sized WebP variants per original and
 * uploads them ALONGSIDE the original (deprecate-don't-destroy: originals are
 * kept as the regen source and as the load-error fallback):
 *
 *   thumb  (~200w)  → tiny surfaces: kit line items, review, search results
 *   card   (~600w)  → card grids, builder tiles, blog covers
 *   detail (~1200w) → product gallery / hero
 *
 * Variant object keys follow a deterministic path convention so a surface can
 * resolve the right variant purely from the original URL:
 *
 *   onboarding/backpack/x/img-1.png  →  onboarding/backpack/x/img-1__thumb.webp
 *                                        onboarding/backpack/x/img-1__card.webp
 *                                        onboarding/backpack/x/img-1__detail.webp
 *
 * The originals live locally under `product-images/` (the same tree that seeded
 * the bucket via `upload-images-v2`), so variants are resized from disk — no
 * download of the 1533 originals is needed. Object keys mirror the local
 * relative paths, exactly as the upload script derives them.
 *
 * Idempotent + resumable: existing variant objects are listed once up front and
 * skipped, so an interrupted run can simply be re-run.
 *
 * Run via `npm run generate-variants` (add `-- --dry-run` to preview counts
 * without touching the bucket).
 */

import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BUCKET,
  LOCAL_ROOT,
  createServiceClient,
  deriveObjectKey,
  listAllObjects,
  loadRequiredEnv,
  walkLocalFiles,
} from "./upload-images-v2";

/** The three display sizes generated for every original image. */
export const VARIANTS = [
  { suffix: "thumb", width: 200 },
  { suffix: "card", width: 600 },
  { suffix: "detail", width: 1200 },
] as const;

/** WebP quality for generated variants (visually lossless at these sizes). */
const WEBP_QUALITY = 80;

/** Originals processed per parallel batch. */
const FILE_BATCH = 8;

/** Milliseconds to wait between batches to stay gentle on the storage API. */
const BATCH_DELAY_MS = 150;

/** Where recorded variant failures are written on completion. */
export const VARIANT_ERROR_LOG = "scripts/variant-errors.json";

/** Extensions treated as resizable source images. */
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);

/**
 * Derive a variant object key from an original object key by replacing the
 * extension with `__<suffix>.webp`. Pure and platform-independent.
 *
 * @param originalKey  Forward-slash object key of the original.
 * @param suffix       Variant suffix (`thumb` | `card` | `detail`).
 */
export function variantKey(originalKey: string, suffix: string): string {
  const dot = originalKey.lastIndexOf(".");
  const base = dot === -1 ? originalKey : originalKey.slice(0, dot);
  return `${base}__${suffix}.webp`;
}

/** True when `key` is an image this script should resize. */
export function isResizableImage(key: string): boolean {
  return IMAGE_EXT.has(extname(key).toLowerCase());
}

/** True when `key` is already a generated variant (never resize a variant). */
export function isVariantKey(key: string): boolean {
  return /__(?:thumb|card|detail)\.webp$/i.test(key);
}

/** Resize a source image buffer to a WebP variant of the given width. */
export async function makeVariant(
  input: Buffer,
  width: number,
): Promise<Buffer> {
  return sharp(input)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

/** A single variant failure recorded during generation. */
export interface VariantError {
  /** The variant object key that failed. */
  key: string;
  /** The error message reported by sharp or Supabase. */
  message: string;
}

/** Outcome of the generation run. */
export interface VariantResult {
  /** Originals discovered locally (images only, variants excluded). */
  originals: number;
  /** Variant objects generated + uploaded this run. */
  generated: number;
  /** Variant objects skipped because they already existed in the bucket. */
  skipped: number;
  /** Total bytes uploaded this run (sum of variant buffer sizes). */
  bytes: number;
  /** Per-variant failures (generation continues past each). */
  errors: VariantError[];
}

type Logger = (message: string) => void;
type Sleep = (ms: number) => Promise<void>;

const defaultSleep: Sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate + upload the three WebP variants for every local original.
 *
 * @param supabase  Service-role client (bucket write access).
 * @param existing  Object keys already present in the bucket (variants skipped).
 * @param dryRun    When true, nothing is generated or uploaded; counts only.
 */
export async function generateVariants(
  supabase: SupabaseClient,
  existing: ReadonlySet<string>,
  dryRun: boolean,
  log: Logger = (message) => console.log(message),
  sleep: Sleep = defaultSleep,
): Promise<VariantResult> {
  const originals = walkLocalFiles(LOCAL_ROOT)
    .map((filePath) => ({ filePath, key: deriveObjectKey(LOCAL_ROOT, filePath) }))
    .filter(({ key }) => isResizableImage(key) && !isVariantKey(key));

  const result: VariantResult = {
    originals: originals.length,
    generated: 0,
    skipped: 0,
    bytes: 0,
    errors: [],
  };

  if (dryRun) {
    let would = 0;
    for (const { key } of originals) {
      for (const { suffix } of VARIANTS) {
        if (!existing.has(variantKey(key, suffix))) would += 1;
      }
    }
    log(
      `[dry-run] ${originals.length} originals → would generate ${would} variant(s) ` +
        `(${originals.length * VARIANTS.length - would} already present).`,
    );
    return result;
  }

  for (let i = 0; i < originals.length; i += FILE_BATCH) {
    const batch = originals.slice(i, i + FILE_BATCH);

    await Promise.all(
      batch.map(async ({ filePath, key }) => {
        // Which variants are still missing for this original?
        const pending = VARIANTS.filter(
          ({ suffix }) => !existing.has(variantKey(key, suffix)),
        );
        if (pending.length === 0) {
          result.skipped += VARIANTS.length;
          return;
        }

        let source: Buffer;
        try {
          source = readFileSync(filePath);
        } catch (err: unknown) {
          for (const { suffix } of pending) {
            result.errors.push({
              key: variantKey(key, suffix),
              message: err instanceof Error ? err.message : String(err),
            });
          }
          return;
        }

        result.skipped += VARIANTS.length - pending.length;

        for (const { suffix, width } of pending) {
          const vKey = variantKey(key, suffix);
          try {
            const buffer = await makeVariant(source, width);
            const { error } = await supabase.storage
              .from(BUCKET)
              .upload(vKey, buffer, {
                upsert: true,
                contentType: "image/webp",
              });
            if (error) {
              result.errors.push({ key: vKey, message: error.message });
              continue;
            }
            result.generated += 1;
            result.bytes += buffer.length;
          } catch (err: unknown) {
            result.errors.push({
              key: vKey,
              message: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }),
    );

    log(
      `[variants] processed ${Math.min(i + FILE_BATCH, originals.length)}/${originals.length} originals ` +
        `— generated ${result.generated}, skipped ${result.skipped}, errors ${result.errors.length}`,
    );

    if (i + FILE_BATCH < originals.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return result;
}

/** Write recorded variant failures to {@link VARIANT_ERROR_LOG}. */
export function writeVariantErrors(
  errors: VariantError[],
  path = VARIANT_ERROR_LOG,
): void {
  writeFileSync(path, `${JSON.stringify(errors, null, 2)}\n`, "utf8");
}

/** Human-readable megabytes. */
function mb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  const env = loadRequiredEnv();
  const supabase = createServiceClient(env);

  console.log(`Listing existing objects in "${BUCKET}"…`);
  const existing = new Set(await listAllObjects(supabase));
  console.log(`Bucket currently holds ${existing.size} object(s).`);

  console.log(
    `Generating WebP variants (${VARIANTS.map((v) => `${v.suffix}=${v.width}w`).join(", ")})${dryRun ? " (dry-run)" : ""}…`,
  );
  const result = await generateVariants(supabase, existing, dryRun);

  if (!dryRun) {
    writeVariantErrors(result.errors);
  }

  console.log(
    `\nDone. originals=${result.originals}, generated=${result.generated}, ` +
      `skipped=${result.skipped}, bytes=${mb(result.bytes)}, errors=${result.errors.length}` +
      (dryRun ? " (dry-run)." : `. Failures written to ${VARIANT_ERROR_LOG}.`),
  );
  if (result.errors.length > 0) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
}
