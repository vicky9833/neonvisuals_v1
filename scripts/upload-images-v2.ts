/**
 * Upload script (v2) for the image & catalogue rebuild pipeline.
 *
 * Clears the Supabase `product-images` storage bucket and (in a later task)
 * uploads the restructured local `product-images/` tree, preserving each file's
 * relative path as its object key.
 *
 * Run via `npm run upload-images` (add `-- --dry-run` to preview without any
 * destructive delete/upload).
 *
 * This file is built up across spec tasks. It implements:
 *   Task 8.1:
 *   - Environment loading from `.env.local` with fail-fast on missing keys
 *   - The recursive bucket clear phase (batches of 100, continue-on-error,
 *     dry-run no-op with a would-delete count)
 *   - The pure `deriveObjectKey` helper (relative POSIX object key)
 *   Task 8.2:
 *   - The resilient upload phase: walk the local `product-images/` tree, upload
 *     in batches of 10 with a 200 ms delay, `upsert: true` + extension-mapped
 *     `contentType`, progress logging, continue-on-failure with an error log,
 *     dry-run no-op with a would-upload count, and `scripts/upload-errors.json`
 *
 * The exported pure helpers (`deriveObjectKey`, `contentTypeFor`,
 * `walkLocalFiles`) carry no side effects beyond reading the filesystem, so they
 * can be imported directly by property-based and integration tests.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/** The Supabase public storage bucket that holds every product image. */
export const BUCKET = "product-images";

/** The local folder whose tree is mirrored into the bucket. */
export const LOCAL_ROOT = "product-images";

/** Objects are deleted from the bucket in batches of this size (Req 7.2). */
export const CLEAR_BATCH = 100;

/** Local files are uploaded in batches of this size (Req 8.3). */
export const UPLOAD_BATCH = 10;

/** Milliseconds to wait between upload batches (Req 8.3). */
export const BATCH_DELAY_MS = 200;

/** Page size used when listing bucket objects. */
const LIST_PAGE = 100;

/**
 * Maps a supported Image_Extension to the `contentType` used on upload
 * (Req 8.4). Extensions are compared lowercased.
 */
export const CONTENT_TYPE: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".avif": "image/avif",
  ".png": "image/png",
};

/** Fallback content type for any extension outside {@link CONTENT_TYPE}. */
const DEFAULT_CONTENT_TYPE = "application/octet-stream";

/** Where recorded upload failures are written on completion (Req 8.7). */
export const UPLOAD_ERROR_LOG = "scripts/upload-errors.json";

/**
 * Derive the object key for a local file: its path relative to the local
 * `product-images/` root, expressed with forward slashes (Req 8.2).
 *
 * Pure and platform-independent — Windows backslashes and POSIX slashes in the
 * relative result are both normalised to `/`, so the key round-trips as a valid
 * storage path on any OS.
 *
 * @param rootDir   The local root folder (e.g. `product-images`).
 * @param filePath  A file path beneath `rootDir`.
 * @returns         The forward-slash object key relative to `rootDir`.
 */
export function deriveObjectKey(rootDir: string, filePath: string): string {
  return relative(rootDir, filePath).split(/[\\/]/).join("/");
}

/** A logger sink; defaults to `console.log`. Injectable for tests. */
export type Logger = (message: string) => void;

/** A single delete-batch failure recorded during the clear phase. */
export interface ClearError {
  /** The object keys in the batch that failed to delete. */
  keys: string[];
  /** The error message reported by Supabase. */
  message: string;
}

/** Outcome of the clear phase. */
export interface ClearResult {
  /** Total objects discovered in the bucket. */
  listed: number;
  /** Total objects actually deleted (0 under `--dry-run`). */
  deleted: number;
  /** Delete-batch errors encountered (clearing continues past each). */
  errors: ClearError[];
}

interface EnvConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
}

/**
 * Parse a `.env`-style file into a plain key/value record. Ignores blank lines
 * and `#` comments and strips surrounding double quotes from values.
 */
function loadEnvFile(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  const contents = readFileSync(path, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    if (line.trimStart().startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line
      .slice(eq + 1)
      .trim()
      .replace(/^"|"$/g, "");
    env[key] = value;
  }
  return env;
}

/**
 * Load and validate the Supabase credentials from `.env.local`, failing fast
 * with a descriptive error when either required key is missing (Req 8.1).
 */
export function loadRequiredEnv(path = ".env.local"): EnvConfig {
  let raw: Record<string, string>;
  try {
    raw = loadEnvFile(path);
  } catch {
    throw new Error(
      `Cannot read ${path}. Create it with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running the upload.`,
    );
  }

  const supabaseUrl = raw.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = raw.SUPABASE_SERVICE_ROLE_KEY;

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s) in ${path}: ${missing.join(", ")}.`,
    );
  }

  return { supabaseUrl, serviceRoleKey };
}

/**
 * Create a service-role Supabase client. Sessions are never persisted because
 * this is a one-shot operational script, not an interactive app.
 */
export function createServiceClient(env: EnvConfig): SupabaseClient {
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false },
  });
}

/**
 * List every object in the bucket recursively (Req 7.1).
 *
 * Supabase's `list()` returns files and folder entries for a single prefix;
 * folder entries have a `null` id. This walks into each folder and pages through
 * results so buckets with more than one page per prefix are fully enumerated.
 *
 * @returns The full set of object keys (files only), forward-slash separated.
 */
export async function listAllObjects(
  supabase: SupabaseClient,
  prefix = "",
): Promise<string[]> {
  const keys: string[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: LIST_PAGE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        // Folder entry — recurse into it.
        const nested = await listAllObjects(supabase, fullPath);
        keys.push(...nested);
      } else {
        keys.push(fullPath);
      }
    }

    if (data.length < LIST_PAGE) break;
    offset += LIST_PAGE;
  }

  return keys;
}

/**
 * Clear the bucket by deleting all objects in batches of {@link CLEAR_BATCH}
 * (Req 7.1, 7.2, 7.4). Under `dryRun` no object is deleted; the count that would
 * be deleted is logged instead (Req 7.3, 8.8). A failing delete batch is
 * recorded and clearing continues with the remaining batches (Req 7.4).
 */
export async function clearBucket(
  supabase: SupabaseClient,
  dryRun: boolean,
  log: Logger = (message) => console.log(message),
): Promise<ClearResult> {
  const keys = await listAllObjects(supabase);

  if (dryRun) {
    log(`[dry-run] would delete ${keys.length} object(s) from "${BUCKET}"`);
    return { listed: keys.length, deleted: 0, errors: [] };
  }

  let deleted = 0;
  const errors: ClearError[] = [];

  for (let i = 0; i < keys.length; i += CLEAR_BATCH) {
    const batch = keys.slice(i, i + CLEAR_BATCH);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) {
      errors.push({ keys: batch, message: error.message });
      log(`[clear] batch of ${batch.length} failed: ${error.message} (continuing)`);
      continue;
    }
    deleted += batch.length;
    log(`[clear] deleted ${deleted}/${keys.length}`);
  }

  return { listed: keys.length, deleted, errors };
}

/**
 * Resolve the `contentType` for a file from its extension (Req 8.4). Unknown
 * extensions fall back to a generic binary type so an unexpected file never
 * blocks the upload.
 */
export function contentTypeFor(filePath: string): string {
  return CONTENT_TYPE[extname(filePath).toLowerCase()] ?? DEFAULT_CONTENT_TYPE;
}

/**
 * Recursively list every file beneath `rootDir` (Req 8.2). Directories are
 * traversed in a stable name order so the upload order is deterministic and the
 * `uploaded/total` progress is reproducible. Returns absolute-relative file
 * paths (relative to the process, as joined onto `rootDir`).
 */
export function walkLocalFiles(rootDir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(rootDir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const entry of entries) {
    const full = join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkLocalFiles(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

/** A single upload failure recorded during the upload phase (Req 8.6). */
export interface UploadError {
  /** The object key (relative POSIX path) that failed to upload. */
  path: string;
  /** The error message reported by Supabase or the filesystem. */
  message: string;
}

/** Outcome of the upload phase. */
export interface UploadResult {
  /** Total files discovered under the local root. */
  total: number;
  /** Files successfully uploaded (0 under `--dry-run`). */
  uploaded: number;
  /** Per-file failures encountered (uploading continues past each). */
  errors: UploadError[];
}

/** Sleep helper, injectable so tests can run without real delays. */
export type Sleep = (ms: number) => Promise<void>;

const defaultSleep: Sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Upload every file under `rootDir` to the bucket, preserving each file's
 * relative path as its object key (Req 8.2). Files are uploaded in batches of
 * {@link UPLOAD_BATCH} with a {@link BATCH_DELAY_MS} pause between batches
 * (Req 8.3); each upload sets `upsert: true` and an extension-mapped
 * `contentType` (Req 8.4). Progress is logged as `uploaded/total` (Req 8.5).
 *
 * A failed upload records `{ path, message }` and uploading continues with the
 * remaining files (Req 8.6). Under `dryRun` nothing is uploaded; the count that
 * would be uploaded is logged instead (Req 8.8).
 */
export async function uploadTree(
  supabase: SupabaseClient,
  rootDir: string,
  dryRun: boolean,
  log: Logger = (message) => console.log(message),
  sleep: Sleep = defaultSleep,
): Promise<UploadResult> {
  const files = walkLocalFiles(rootDir);
  const total = files.length;

  if (dryRun) {
    log(`[dry-run] would upload ${total} object(s) to "${BUCKET}"`);
    return { total, uploaded: 0, errors: [] };
  }

  let uploaded = 0;
  const errors: UploadError[] = [];

  for (let i = 0; i < files.length; i += UPLOAD_BATCH) {
    const batch = files.slice(i, i + UPLOAD_BATCH);

    await Promise.all(
      batch.map(async (filePath) => {
        const key = deriveObjectKey(rootDir, filePath);
        try {
          const body = readFileSync(filePath);
          const { error } = await supabase.storage
            .from(BUCKET)
            .upload(key, body, {
              upsert: true,
              contentType: contentTypeFor(filePath),
            });
          if (error) {
            errors.push({ path: key, message: error.message });
            return;
          }
          uploaded += 1;
        } catch (err: unknown) {
          errors.push({
            path: key,
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }),
    );

    log(`[upload] uploaded ${uploaded}/${total}`);

    if (i + UPLOAD_BATCH < files.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return { total, uploaded, errors };
}

/**
 * Write all recorded upload failures to {@link UPLOAD_ERROR_LOG} (Req 8.7).
 * The file is always written — an empty array signals a clean run.
 */
export function writeUploadErrors(
  errors: UploadError[],
  path = UPLOAD_ERROR_LOG,
): void {
  writeFileSync(path, `${JSON.stringify(errors, null, 2)}\n`, "utf8");
}

/** Entry point: parse flags, authenticate, and run the clear + upload phases. */
async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  const env = loadRequiredEnv();
  const supabase = createServiceClient(env);

  console.log(
    `Clearing bucket "${BUCKET}"${dryRun ? " (dry-run)" : ""}…`,
  );
  const clearResult = await clearBucket(supabase, dryRun);
  console.log(
    `Clear phase complete: listed ${clearResult.listed}, deleted ${clearResult.deleted}, errors ${clearResult.errors.length}.`,
  );

  console.log(
    `Uploading "${LOCAL_ROOT}/" to bucket "${BUCKET}"${dryRun ? " (dry-run)" : ""}…`,
  );
  const uploadResult = await uploadTree(supabase, LOCAL_ROOT, dryRun);
  if (!dryRun) {
    writeUploadErrors(uploadResult.errors);
  }
  console.log(
    `Upload phase complete: uploaded ${uploadResult.uploaded}/${uploadResult.total}, errors ${uploadResult.errors.length}` +
      (dryRun ? " (dry-run)." : `. Failures written to ${UPLOAD_ERROR_LOG}.`),
  );
}

// Only run when executed directly (not when imported by tests).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
}
