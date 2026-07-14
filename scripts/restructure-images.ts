/**
 * Restructure script for the image & catalogue rebuild pipeline.
 *
 * This module rebuilds the local `product-images/` tree from the authoritative
 * `neonvisualsfinal/` source folder and emits `scripts/image-manifest.json`.
 *
 * It is built up incrementally across several spec tasks. This file currently
 * provides the pure slugification foundations (task 3.1):
 *   - `slugify`            — slugify a single path segment
 *   - `slugifyFileName`    — slugify a file's base name, retaining its extension
 *   - `NameAllocator`      — per-destination-folder collision-resolving allocator
 *
 * The exported functions are intentionally pure (no filesystem side effects) so
 * they can be imported directly by property-based tests. Later tasks extend this
 * file with the collection map, product detection, path building, tree rebuild,
 * and manifest emission.
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { BucketCode, MilestoneTenure } from "../src/lib/types/product";

/**
 * Slugify a single path segment.
 *
 * Transformation (Requirement 4.1):
 *   1. Lowercase the segment.
 *   2. Replace each run of whitespace with a single hyphen.
 *   3. Remove any character outside the set `[a-z0-9-]`.
 *   4. Collapse consecutive hyphens into a single hyphen.
 *   5. Trim leading and trailing hyphens.
 *
 * The result contains only characters from `[a-z0-9-]` and never begins or ends
 * with a hyphen.
 */
export function slugify(segment: string): string {
  return segment
    .toLowerCase()
    .replace(/\s+/g, "-") // spaces -> single hyphen
    .replace(/[^a-z0-9-]/g, "") // strip anything outside [a-z0-9-]
    .replace(/-+/g, "-") // collapse consecutive hyphens
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}

/**
 * Slugify a file name while retaining its extension (Requirement 4.2).
 *
 * The base name is slugified with {@link slugify}; the original extension is
 * lowercased and re-appended unchanged otherwise. Files without an extension are
 * handled gracefully (the whole name is treated as the base).
 */
export function slugifyFileName(name: string): string {
  const ext = extname(name);
  const base = ext.length > 0 ? name.slice(0, -ext.length) : name;
  return `${slugify(base)}${ext.toLowerCase()}`;
}

/** A logger sink for collision events; defaults to `console.log`. */
export type CollisionLogger = (message: string) => void;

/**
 * Splits a file name into its base and extension parts, preserving whatever the
 * caller passed for the extension (already-lowercased for slugified names).
 */
function splitName(fileName: string): { base: string; ext: string } {
  const ext = extname(fileName);
  const base = ext.length > 0 ? fileName.slice(0, -ext.length) : fileName;
  return { base, ext };
}

/**
 * Per-destination-folder name allocator (Requirement 4.3).
 *
 * When two source files in the same destination folder resolve to the same
 * slugified name, a numeric suffix (`-2`, `-3`, …) is appended to the base name
 * before the extension until the name is unique within that folder, and the
 * collision is logged.
 *
 * State is tracked independently per destination folder, so identical file names
 * in different folders never collide.
 */
export class NameAllocator {
  /** Maps a destination-folder key to the set of names already assigned in it. */
  private readonly usedByFolder = new Map<string, Set<string>>();

  private readonly log: CollisionLogger;

  constructor(log: CollisionLogger = (message) => console.log(message)) {
    this.log = log;
  }

  /**
   * Allocate a unique file name within `folder`.
   *
   * @param folder        The destination folder key (e.g. its relative path).
   * @param desiredName   The slugified file name the caller wants to use.
   * @returns             A name guaranteed unique within `folder`. Equal to
   *                      `desiredName` when there is no collision.
   */
  allocate(folder: string, desiredName: string): string {
    let used = this.usedByFolder.get(folder);
    if (!used) {
      used = new Set<string>();
      this.usedByFolder.set(folder, used);
    }

    if (!used.has(desiredName)) {
      used.add(desiredName);
      return desiredName;
    }

    const { base, ext } = splitName(desiredName);
    let suffix = 2;
    let candidate = `${base}-${suffix}${ext}`;
    while (used.has(candidate)) {
      suffix += 1;
      candidate = `${base}-${suffix}${ext}`;
    }

    used.add(candidate);
    this.log(
      `[collision] "${desiredName}" already exists in "${folder}"; renamed to "${candidate}"`,
    );
    return candidate;
  }
}

/* -------------------------------------------------------------------------- */
/* Collection mapping and top-level folder resolution (task 4.1)              */
/* -------------------------------------------------------------------------- */

/** The authoritative source folder name, expected at the project root. */
export const SOURCE_FOLDER = "neonvisualsfinal";

/**
 * The special top-level folder that supplies Kit_Hero_Images. It is NOT a
 * collection and must never be filed under the collection output (Req 1.2).
 */
export const ALL_KITS_FOLDER = "ALL KITS";

/**
 * A single collection's fixed mapping: its bucket letter (`"A"`–`"K"`), the
 * short slug used only in storage paths, and its human-facing display name.
 */
export interface CollectionMap {
  /** Bucket code `"A"`–`"K"`. */
  letter: BucketCode;
  /** Short slug used only in storage object keys / URLs. */
  storageSlug: string;
  /** Human-facing collection display name. */
  displayName: string;
}

/**
 * The fixed, exhaustive collection lookup keyed by the EXACT top-level source
 * folder name (Requirement 1.1). Folder-name matching is case- and
 * whitespace-sensitive against the real directory names in `neonvisualsfinal/`.
 *
 * `ALL KITS` is intentionally absent — it is handled separately as a
 * Kit_Hero_Images source (Requirement 1.2).
 */
export const COLLECTION_MAP: Record<string, CollectionMap> = {
  "ON BOARDING KIT": { letter: "A", storageSlug: "onboarding", displayName: "Welcome & Onboarding" },
  "MILESTONE AND WORK ANNIVERSARY": { letter: "B", storageSlug: "milestone", displayName: "Milestone & Anniversary" },
  "CEO & LEADERSHIP RECOGNITION": { letter: "C", storageSlug: "ceo-leadership", displayName: "CEO & Leadership Recognition" },
  "FESTIVE AND SEASONAL": { letter: "D", storageSlug: "festive", displayName: "Festive & Seasonal" },
  "CLIENT APPRECIATION": { letter: "E", storageSlug: "client", displayName: "Client Appreciation" },
  "EXPERIENCE KITS": { letter: "F", storageSlug: "experience-kits", displayName: "Experience Kits" },
  "TECH AND DIGITAL FORWARD": { letter: "G", storageSlug: "tech-forward", displayName: "Tech-Forward & Digital" },
  "SUSTAINABILITY & ECO": { letter: "H", storageSlug: "sustainability", displayName: "Sustainability & Eco" },
  "EVENTS AND GENERAL GIFTS": { letter: "I", storageSlug: "events", displayName: "Events & General Gifts" },
  "college and events": { letter: "J", storageSlug: "college", displayName: "College Events" },
  "VISITING CARD": { letter: "K", storageSlug: "visiting-cards", displayName: "Visiting Cards & Business Stationery" },
};

/**
 * The classification of a single top-level source folder.
 *
 *  - `collection`  — a mapped Collection_Folder, carrying its {@link CollectionMap}.
 *  - `kit-hero`    — the `ALL KITS` folder; a Kit_Hero_Images source, not a collection.
 *  - `unmatched`   — any other top-level folder; logged and excluded from output.
 */
export type TopLevelResolution =
  | { kind: "collection"; name: string; collection: CollectionMap }
  | { kind: "kit-hero"; name: string }
  | { kind: "unmatched"; name: string };

/**
 * Classify a single top-level folder name against the fixed mapping.
 *
 * Requirements 1.1–1.3:
 *   - Exact match in {@link COLLECTION_MAP} → `collection`.
 *   - `ALL KITS` → `kit-hero` (never a collection).
 *   - Anything else → `unmatched`.
 */
export function resolveTopLevelFolder(name: string): TopLevelResolution {
  if (name === ALL_KITS_FOLDER) {
    return { kind: "kit-hero", name };
  }

  const collection = COLLECTION_MAP[name];
  if (collection) {
    return { kind: "collection", name, collection };
  }

  return { kind: "unmatched", name };
}

/** The partitioned result of resolving a set of top-level folder names. */
export interface TopLevelResolutionResult {
  /** Matched Collection_Folders, in the order they were provided. */
  collections: { name: string; collection: CollectionMap }[];
  /** The name of the `ALL KITS` folder if present, otherwise `null`. */
  kitHeroFolder: string | null;
  /** Names of unmatched folders that were logged and excluded (Req 1.3). */
  unmatched: string[];
}

/**
 * Resolve and partition a list of top-level folder names.
 *
 * Unmatched folders (neither a mapped collection nor `ALL KITS`) are logged and
 * excluded from the collection output (Requirement 1.3).
 *
 * @param names   The immediate child folder names of the source folder.
 * @param log     Logger sink for unmatched-folder notices; defaults to `console.log`.
 */
export function resolveTopLevelFolders(
  names: readonly string[],
  log: CollisionLogger = (message) => console.log(message),
): TopLevelResolutionResult {
  const collections: { name: string; collection: CollectionMap }[] = [];
  const unmatched: string[] = [];
  let kitHeroFolder: string | null = null;

  for (const name of names) {
    const resolution = resolveTopLevelFolder(name);
    switch (resolution.kind) {
      case "collection":
        collections.push({ name: resolution.name, collection: resolution.collection });
        break;
      case "kit-hero":
        kitHeroFolder = resolution.name;
        break;
      case "unmatched":
        unmatched.push(resolution.name);
        log(`[unmatched] top-level folder "${resolution.name}" is not a known collection and is excluded`);
        break;
    }
  }

  return { collections, kitHeroFolder, unmatched };
}

/**
 * Error thrown when the authoritative source folder is missing (Requirement 1.4).
 * Carries the resolved path so callers and logs can identify exactly what was
 * expected and where.
 */
export class MissingSourceFolderError extends Error {
  constructor(public readonly sourcePath: string) {
    super(
      `Source folder "${SOURCE_FOLDER}" was not found at "${sourcePath}". ` +
        `Place the authoritative "${SOURCE_FOLDER}/" directory at the project root before running the restructure. ` +
        `No files were deleted or modified.`,
    );
    this.name = "MissingSourceFolderError";
  }
}

/**
 * Fail fast when the source folder is absent, BEFORE any deletion or copy is
 * attempted (Requirement 1.4).
 *
 * @param rootDir  The project root directory that should contain the source folder.
 * @returns        The resolved absolute path to the existing source folder.
 * @throws {MissingSourceFolderError} when the folder is missing or is not a directory.
 */
export function assertSourceFolderExists(rootDir: string): string {
  const sourcePath = join(rootDir, SOURCE_FOLDER);
  if (!existsSync(sourcePath) || !statSync(sourcePath).isDirectory()) {
    throw new MissingSourceFolderError(sourcePath);
  }
  return sourcePath;
}

/* -------------------------------------------------------------------------- */
/* Product-level folder detection (task 4.3)                                  */
/* -------------------------------------------------------------------------- */

/**
 * The set of supported raster image extensions (Image_Extension). Comparison is
 * done on the lowercased extension including the leading dot.
 *
 * Defined here because product detection must distinguish image files from
 * other files; the storage-path/special-file handling (task 5.1) reuses it.
 */
export const IMAGE_EXT: ReadonlySet<string> = new Set([
  ".webp",
  ".jpg",
  ".jpeg",
  ".avif",
  ".png",
]);

/** Returns true when `name` has a supported {@link IMAGE_EXT} extension. */
export function isImageFile(name: string): boolean {
  return IMAGE_EXT.has(extname(name).toLowerCase());
}

/**
 * Collection `B` (milestone) tenure subfolders, keyed by their EXACT source
 * folder name. `segment` is the slug threaded into the storage path (Req 3.4);
 * `milestone` is the value recorded for later `milestone` inference (Req 15.2).
 */
export const TENURE_FOLDERS: Record<string, { segment: string; milestone: MilestoneTenure }> = {
  "ONE YEAR": { segment: "one-year", milestone: "1-year" },
  "FIVE YEAR": { segment: "five-year", milestone: "5-year" },
  "TEN YEAR": { segment: "ten-year", milestone: "10-year" },
};

/**
 * A single directory entry, abstracted away from the concrete filesystem so the
 * classifier can be exercised by property tests over in-memory trees.
 */
export interface DirEntry {
  /** The entry's base name (no path). */
  name: string;
  /** Whether the entry is a directory. */
  isDirectory: boolean;
}

/**
 * A minimal directory-reading abstraction. `detectProducts` depends only on this
 * interface, keeping the classifier logic separable from filesystem side effects
 * (task 4.4 exercises it with an in-memory reader).
 */
export interface DirReader {
  /** List the immediate entries of `dirPath`. */
  readDir(dirPath: string): DirEntry[];
}

/** A real-filesystem {@link DirReader} used by the restructure script itself. */
export const fsDirReader: DirReader = {
  readDir(dirPath: string): DirEntry[] {
    return readdirSync(dirPath, { withFileTypes: true }).map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
    }));
  },
};

/** One variant set (subfolder) of a detected product. */
export interface DetectedVariantSet {
  /** Original (unslugified) subfolder name. */
  name: string;
  /** Stable-sorted image file names contained directly in this variant set. */
  images: string[];
}

/**
 * A single detected Product_Folder (Requirement 2.4). Records the collection
 * letter, the product folder path and name, the optional milestone tenure
 * (collection `B` only), and the ordered variant sets and image files.
 *
 * A flat-image product has `variantSets === []` and its images in `images`.
 * A variant-set product has its images grouped under `variantSets` and an empty
 * top-level `images` array (ordered images across variant sets are recoverable
 * by concatenating each variant set's `images`).
 */
export interface DetectedProduct {
  /** Owning collection letter `"A"`–`"K"`. */
  collectionLetter: BucketCode;
  /** Path to the product folder, as navigated through the {@link DirReader}. */
  productPath: string;
  /** Original (unslugified) product folder base name. */
  productName: string;
  /** Tenure path segment for collection `B` (e.g. `"one-year"`); absent otherwise. */
  tenureSegment?: string;
  /** Milestone tenure for collection `B` (e.g. `"1-year"`); absent otherwise. */
  milestone?: MilestoneTenure;
  /** Ordered variant sets; empty for flat-image products. */
  variantSets: DetectedVariantSet[];
  /** Stable-sorted image file names for flat products; empty when variant sets exist. */
  images: string[];
}

/**
 * Stable, locale-independent name comparison (code-point order). Used for every
 * directory and file ordering so the manifest and generated catalogue are
 * reproducible across platforms.
 */
export function compareNames(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** The tenure context threaded through recursion for collection `B`. */
interface DetectContext {
  collectionLetter: BucketCode;
  tenureSegment?: string;
  milestone?: MilestoneTenure;
}

/** Returns true when `dirPath` has at least one immediate subdirectory. */
function hasSubdirectories(reader: DirReader, dirPath: string): boolean {
  return reader.readDir(dirPath).some((entry) => entry.isDirectory);
}

/** Stable-sorted image file names contained directly in `dirPath`. */
function sortedImageNames(reader: DirReader, dirPath: string): string[] {
  return reader
    .readDir(dirPath)
    .filter((entry) => !entry.isDirectory && isImageFile(entry.name))
    .map((entry) => entry.name)
    .sort(compareNames);
}

/** Build a flat-image {@link DetectedProduct} from the current context. */
function makeFlatProduct(
  dirPath: string,
  ctx: DetectContext,
  images: string[],
): DetectedProduct {
  const product: DetectedProduct = {
    collectionLetter: ctx.collectionLetter,
    productPath: dirPath,
    productName: basename(dirPath),
    variantSets: [],
    images,
  };
  if (ctx.tenureSegment !== undefined) product.tenureSegment = ctx.tenureSegment;
  if (ctx.milestone !== undefined) product.milestone = ctx.milestone;
  return product;
}

/** Build a variant-set {@link DetectedProduct} from the current context. */
function makeVariantProduct(
  dirPath: string,
  ctx: DetectContext,
  variantSets: DetectedVariantSet[],
): DetectedProduct {
  const product: DetectedProduct = {
    collectionLetter: ctx.collectionLetter,
    productPath: dirPath,
    productName: basename(dirPath),
    variantSets,
    images: [],
  };
  if (ctx.tenureSegment !== undefined) product.tenureSegment = ctx.tenureSegment;
  if (ctx.milestone !== undefined) product.milestone = ctx.milestone;
  return product;
}

/**
 * Recursive product-folder classifier (Requirements 2.1–2.4).
 *
 * Terminology: a directory has "image children" (files with an
 * {@link IMAGE_EXT} extension) and "subdir children" (immediate subdirectories).
 *
 * Rules, evaluated in order:
 *   - No subdirectories (Req 2.1): a leaf. If it has image children, it is a
 *     single flat-image Product_Folder; otherwise nothing is emitted.
 *   - Collection `B` tenure (Req 3.4 / 15.2): when the collection is `B`, no
 *     tenure is threaded yet, and any immediate subfolder is a
 *     {@link TENURE_FOLDERS} entry, recurse into each subfolder threading the
 *     recognised tenure (non-tenure siblings recurse with no tenure). This is
 *     evaluated before the variant rule so a tenure folder is never mistaken for
 *     a variant set.
 *   - Variant-set product (Req 2.2): when every immediate subfolder itself has
 *     no subdirectories, this directory is a single Product_Folder whose
 *     subfolders are its Variant_Sets (stable-sorted, images stable-sorted).
 *   - Deeper nesting (Req 2.3): otherwise recurse into each subfolder.
 *
 * All directory and file orderings use {@link compareNames} for determinism
 * (supports Req 2.4, 5.3).
 *
 * @param reader           Directory-reading abstraction (real FS or in-memory).
 * @param dir              The directory to classify (a collection folder at the
 *                         top level, or a nested subfolder during recursion).
 * @param collectionLetter The owning collection letter `"A"`–`"K"`.
 * @returns                Every Product_Folder detected beneath `dir`, in stable
 *                         depth-first order.
 */
export function detectProducts(
  reader: DirReader,
  dir: string,
  collectionLetter: BucketCode,
): DetectedProduct[] {
  const products: DetectedProduct[] = [];
  detectInto(reader, dir, { collectionLetter }, products);
  return products;
}

/** Recursion worker for {@link detectProducts}; appends detected products to `out`. */
function detectInto(
  reader: DirReader,
  dir: string,
  ctx: DetectContext,
  out: DetectedProduct[],
): void {
  const entries = reader.readDir(dir);
  const imageChildren = entries
    .filter((entry) => !entry.isDirectory && isImageFile(entry.name))
    .map((entry) => entry.name)
    .sort(compareNames);
  const subdirs = entries
    .filter((entry) => entry.isDirectory)
    .map((entry) => entry.name)
    .sort(compareNames);

  // Req 2.1 — leaf directory: only images (or nothing).
  if (subdirs.length === 0) {
    if (imageChildren.length > 0) {
      out.push(makeFlatProduct(dir, ctx, imageChildren));
    }
    return;
  }

  // Req 3.4 / 15.2 — collection B tenure recognition, evaluated before the
  // variant rule so tenure folders are never treated as variant sets.
  if (
    ctx.collectionLetter === "B" &&
    ctx.tenureSegment === undefined &&
    subdirs.some((name) => TENURE_FOLDERS[name] !== undefined)
  ) {
    for (const name of subdirs) {
      const tenure = TENURE_FOLDERS[name];
      const childCtx: DetectContext =
        tenure !== undefined
          ? {
              collectionLetter: ctx.collectionLetter,
              tenureSegment: tenure.segment,
              milestone: tenure.milestone,
            }
          : ctx;
      detectInto(reader, join(dir, name), childCtx, out);
    }
    return;
  }

  // Req 2.2 — variant-set product: every immediate subfolder has no subfolders.
  const everySubdirIsLeaf = subdirs.every(
    (name) => !hasSubdirectories(reader, join(dir, name)),
  );
  if (everySubdirIsLeaf) {
    const variantSets: DetectedVariantSet[] = subdirs.map((name) => ({
      name,
      images: sortedImageNames(reader, join(dir, name)),
    }));
    out.push(makeVariantProduct(dir, ctx, variantSets));
    return;
  }

  // Req 2.3 — deeper nesting: recurse into each subfolder (stable-sorted).
  for (const name of subdirs) {
    detectInto(reader, join(dir, name), ctx, out);
  }
}

/* -------------------------------------------------------------------------- */
/* Storage-path construction and file-extension classification (task 5.1)     */
/* -------------------------------------------------------------------------- */

/**
 * The video extension that is explicitly recognised and skipped (Requirement
 * 6.1). Compared on the lowercased extension including the leading dot.
 */
export const MP4_EXT = ".mp4";

/**
 * The classification of a source file by extension (Requirement 6):
 *
 *  - `"image"`       — a supported {@link IMAGE_EXT} raster image; copied.
 *  - `"mp4"`         — an `.mp4` video; skipped, logged, and counted separately
 *                      (Req 6.1, 6.3).
 *  - `"unsupported"` — any other extension; skipped and logged with its
 *                      extension (Req 6.2).
 */
export type FileClassification = "image" | "mp4" | "unsupported";

/**
 * Classify a file by its extension (Requirements 6.1, 6.2, 6.3).
 *
 * The comparison is case-insensitive on the extension. Files whose extension is
 * a supported image type are `"image"`; `.mp4` files are `"mp4"` so callers can
 * skip and count them separately; everything else (including files with no
 * extension) is `"unsupported"`.
 *
 * This is a pure classifier — the actual skip/log/count side effects live in the
 * tree-rebuild step (task 6.1); this function only decides the category.
 *
 * @param name  The file name (with extension) to classify.
 */
export function classifyFile(name: string): FileClassification {
  if (isImageFile(name)) return "image";
  if (extname(name).toLowerCase() === MP4_EXT) return "mp4";
  return "unsupported";
}

/**
 * The component segments of a destination storage path (Requirement 3.2, 3.4).
 *
 * `storageSlug` and `tenureSegment` are already-final slugs sourced from the
 * fixed {@link COLLECTION_MAP} / {@link TENURE_FOLDERS} constants and are used
 * verbatim. `productName`, `variantName`, and `fileName` are the raw source
 * names and are slugified by the builder so the produced path is always
 * well-formed.
 */
export interface DestinationPathParts {
  /** Collection storage slug (e.g. `"onboarding"`), used verbatim. */
  storageSlug: string;
  /**
   * Tenure path segment for collection `B` (e.g. `"one-year"`), used verbatim.
   * Omitted for every other collection (Req 3.4).
   */
  tenureSegment?: string;
  /** Raw product folder name; slugified into the product segment. */
  productName: string;
  /**
   * Raw variant-set folder name; slugified into the variant segment. Omitted for
   * flat-image products so the variant segment is absent (Req 3.2).
   */
  variantName?: string;
  /** Raw (or already-slugified) file name; slugified via {@link slugifyFileName}. */
  fileName: string;
}

/**
 * Build a destination storage path (Requirements 3.2, 3.4).
 *
 * Produces `<collection-storage-slug>/[<tenure>/]<product-slug>/[<variant-slug>/]<file>`:
 *
 *   - The tenure segment appears only when `tenureSegment` is provided (collection
 *     `B` only) and is inserted between the collection and product segments (Req 3.4).
 *   - The variant segment is omitted for flat-image products where `variantName`
 *     is absent (Req 3.2).
 *   - The product and variant names are slugified with {@link slugify}; the file
 *     name is slugified with {@link slugifyFileName}, retaining its extension
 *     (Req 4.2, 3.3). `slugifyFileName` is idempotent, so passing an
 *     already-slugified / collision-allocated file name is safe.
 *
 * Segments are joined with `/` (POSIX separators) to form a valid storage object
 * key. The builder is pure and performs no filesystem access.
 *
 * @param parts  The destination path components.
 * @returns      The slugified relative storage path.
 */
export function buildDestinationPath(parts: DestinationPathParts): string {
  const segments: string[] = [parts.storageSlug];
  if (parts.tenureSegment !== undefined && parts.tenureSegment.length > 0) {
    segments.push(parts.tenureSegment);
  }
  segments.push(slugify(parts.productName));
  if (parts.variantName !== undefined && parts.variantName.length > 0) {
    segments.push(slugify(parts.variantName));
  }
  segments.push(slugifyFileName(parts.fileName));
  return segments.join("/");
}

/* -------------------------------------------------------------------------- */
/* Local tree rebuild and manifest emission (task 6.1)                        */
/* -------------------------------------------------------------------------- */

/** The local destination folder that mirrors the storage bucket layout. */
export const PRODUCT_IMAGES_DIR = "product-images";

/** Path of the emitted manifest, relative to the project root. */
export const MANIFEST_PATH = join("scripts", "image-manifest.json");

/**
 * Storage slug used for Kit_Hero_Images copied out of the `ALL KITS` source
 * folder. `ALL KITS` is not a collection (Req 1.2), so its images live under a
 * dedicated top-level slug rather than any collection slug. The slug is the
 * slugified form of the source folder name so it is predictable and URL-safe.
 */
export const KIT_HERO_STORAGE_SLUG = "all-kits";

/**
 * A single planned file copy: the absolute source path and the relative POSIX
 * destination storage path (the object key, minus the `product-images/` prefix).
 * Planning is pure; the actual `copyFileSync` happens in {@link main}.
 */
export interface FileCopy {
  /** Absolute source file path. */
  sourceAbsPath: string;
  /** Relative destination storage path (POSIX separators). */
  destRelPath: string;
}

/**
 * A single Product_Folder record in the manifest (Requirement 5.3). Records the
 * collection letter, the storage slug, the product slug, the original source
 * path (for audit), the optional milestone tenure (collection `B` only), the
 * ordered variant-set slugs, and the ordered relative storage paths of the
 * product's images.
 */
export interface ManifestProduct {
  /** Owning collection letter `"A"`–`"K"`. */
  collectionLetter: BucketCode;
  /** Collection storage slug (e.g. `"onboarding"`). */
  storageSlug: string;
  /** Slugified product folder name. */
  productSlug: string;
  /** Original source folder path, retained for auditing. */
  sourcePath: string;
  /** Milestone tenure for collection `B` products; absent otherwise. */
  milestone?: MilestoneTenure;
  /** Ordered variant-set slugs; empty for flat-image products. */
  variantSets: string[];
  /** Ordered relative storage paths of this product's images. */
  images: string[];
}

/** The completion summary counts recorded in the manifest (Req 3.5, 6.3). */
export interface ManifestSummary {
  /** Total source directories traversed under processed top-level folders. */
  foldersProcessed: number;
  /** Total image files copied into the rebuilt tree. */
  filesCopied: number;
  /** `.mp4` files skipped, counted separately (Req 6.3). */
  filesSkippedMp4: number;
  /** Non-image, non-`.mp4` files skipped. */
  filesSkippedOther: number;
  /** Total copy errors encountered. */
  errors: number;
  /** Top-level folders that matched no collection and were excluded (Req 1.3). */
  unmatchedTopLevelFolders: string[];
}

/**
 * The full image manifest (Requirement 5). Describes the rebuilt slugified tree:
 * per-folder direct image-file counts, one record per detected Product_Folder,
 * the Kit_Hero_Images relative paths, and the completion summary.
 */
export interface ImageManifest {
  /** ISO-8601 timestamp of when the manifest was generated. */
  generatedAt: string;
  /** The source folder name (`"neonvisualsfinal"`). */
  source: string;
  /** Slugified folder path → count of image files directly inside it (Req 5.2). */
  folderCounts: Record<string, number>;
  /** One record per detected Product_Folder (Req 5.3). */
  products: ManifestProduct[];
  /** Relative storage paths of Kit_Hero_Images sourced from `ALL KITS`. */
  kitHeroImages: string[];
  /** Completion summary counts. */
  summary: ManifestSummary;
}

/**
 * Build the destination folder key (POSIX, no trailing file) for a product's
 * images: `<storage-slug>/[<tenure>/]<product-slug>/[<variant-slug>]`. The
 * tenure segment appears only for collection `B`; the variant segment is omitted
 * for flat-image products. Product and variant names are slugified; the storage
 * and tenure slugs are already-final and used verbatim.
 */
function buildFolderKey(
  storageSlug: string,
  tenureSegment: string | undefined,
  productName: string,
  variantName: string | undefined,
): string {
  const segments: string[] = [storageSlug];
  if (tenureSegment !== undefined && tenureSegment.length > 0) {
    segments.push(tenureSegment);
  }
  segments.push(slugify(productName));
  if (variantName !== undefined && variantName.length > 0) {
    segments.push(slugify(variantName));
  }
  return segments.join("/");
}

/**
 * Plan the copies and manifest record(s) for a single detected product (pure).
 *
 * Leaf-folder product model (Requirement 2, revised): every LEAF folder (a
 * directory that contains only image files and no image-containing subfolders)
 * is its own Product_Folder. Concretely:
 *
 *   - A flat-image {@link DetectedProduct} (`variantSets === []`) yields exactly
 *     one {@link ManifestProduct}, as before.
 *   - A variant-set {@link DetectedProduct} (subfolders that are themselves
 *     leaves) is SPLIT into one {@link ManifestProduct} per variant set. Each
 *     emitted product owns only its own leaf folder's images, so its gallery is
 *     the 3-8 images physically inside that leaf, never the union of sibling
 *     folders. Its `sourcePath` points at the leaf folder so the catalogue
 *     derives the product `name` from the leaf name (e.g. "Antique Copper
 *     Bottle").
 *
 * Crucially, the destination storage keys are computed with the SAME folder key
 * (`<storage-slug>/[<tenure>/]<parent-product-slug>/<variant-slug>/<file>`) used
 * before the split, so the rebuilt tree (and therefore the already-uploaded
 * bucket object keys) stays byte-identical. Only the manifest grouping changes;
 * no image needs re-uploading.
 *
 * Produces one {@link FileCopy} per image (source absolute path → relative
 * slugified destination). The shared {@link NameAllocator} guarantees
 * destination file names are unique within each destination folder (Req 4.3), so
 * the returned relative paths are collision-free. No filesystem writes occur here.
 *
 * @param product     A product emitted by {@link detectProducts}.
 * @param storageSlug The owning collection's storage slug.
 * @param allocator   Shared allocator (typically one per restructure run).
 * @returns           One manifest product per leaf folder, plus the flat list of
 *                     planned copies (order-preserving across all leaves).
 */
export function planProduct(
  product: DetectedProduct,
  storageSlug: string,
  allocator: NameAllocator,
): { manifestProducts: ManifestProduct[]; copies: FileCopy[] } {
  const copies: FileCopy[] = [];
  const manifestProducts: ManifestProduct[] = [];

  /**
   * Plan the copies for one leaf folder and return its ordered, collision-free
   * relative storage paths. The folder key is derived from the PARENT product
   * name and the (optional) variant name, so keys are identical to the
   * pre-split layout.
   */
  const planLeaf = (
    fileNames: readonly string[],
    variantName: string | undefined,
  ): string[] => {
    const folderKey = buildFolderKey(
      storageSlug,
      product.tenureSegment,
      product.productName,
      variantName,
    );
    const leafImages: string[] = [];
    for (const fileName of fileNames) {
      const allocated = allocator.allocate(folderKey, slugifyFileName(fileName));
      const destRelPath = `${folderKey}/${allocated}`;
      leafImages.push(destRelPath);
      copies.push({
        sourceAbsPath:
          variantName !== undefined
            ? join(product.productPath, variantName, fileName)
            : join(product.productPath, fileName),
        destRelPath,
      });
    }
    return leafImages;
  };

  if (product.variantSets.length > 0) {
    // Split: one product per variant (leaf) set. Each leaf owns only its own
    // images; `sourcePath` points at the leaf so the catalogue derives the
    // product name from the leaf folder (e.g. "Antique Copper Bottle").
    for (const variant of product.variantSets) {
      const images = planLeaf(variant.images, variant.name);
      if (images.length === 0) continue; // leaf with no images emits nothing
      const manifestProduct: ManifestProduct = {
        collectionLetter: product.collectionLetter,
        storageSlug,
        productSlug: slugify(variant.name),
        sourcePath: join(product.productPath, variant.name),
        variantSets: [],
        images,
      };
      if (product.milestone !== undefined) {
        manifestProduct.milestone = product.milestone;
      }
      manifestProducts.push(manifestProduct);
    }
  } else {
    // Flat-image product: a single leaf folder, one manifest product.
    const images = planLeaf(product.images, undefined);
    const manifestProduct: ManifestProduct = {
      collectionLetter: product.collectionLetter,
      storageSlug,
      productSlug: slugify(product.productName),
      sourcePath: product.productPath,
      variantSets: [],
      images,
    };
    if (product.milestone !== undefined) {
      manifestProduct.milestone = product.milestone;
    }
    manifestProducts.push(manifestProduct);
  }

  return { manifestProducts, copies };
}

/**
 * Plan the copies for Kit_Hero_Images sourced from the `ALL KITS` folder (pure).
 *
 * Walks `allKitsDir` recursively (stable-sorted), copying every image into the
 * {@link KIT_HERO_STORAGE_SLUG} tree while preserving the slugified relative
 * subfolder structure. Non-image files are ignored here — they are counted as
 * skips separately by {@link countSkippedFiles}.
 *
 * @param reader     Directory-reading abstraction.
 * @param allKitsDir Absolute path to the `ALL KITS` source folder.
 * @param allocator  Shared allocator for per-folder name uniqueness.
 */
export function planKitHeroImages(
  reader: DirReader,
  allKitsDir: string,
  allocator: NameAllocator,
): FileCopy[] {
  const copies: FileCopy[] = [];

  const walk = (dir: string, relSlugs: readonly string[]): void => {
    const entries = reader.readDir(dir);
    const images = entries
      .filter((entry) => !entry.isDirectory && isImageFile(entry.name))
      .map((entry) => entry.name)
      .sort(compareNames);
    const subdirs = entries
      .filter((entry) => entry.isDirectory)
      .map((entry) => entry.name)
      .sort(compareNames);

    const folderKey = [KIT_HERO_STORAGE_SLUG, ...relSlugs].join("/");
    for (const image of images) {
      const allocated = allocator.allocate(folderKey, slugifyFileName(image));
      copies.push({
        sourceAbsPath: join(dir, image),
        destRelPath: `${folderKey}/${allocated}`,
      });
    }

    for (const sub of subdirs) {
      walk(join(dir, sub), [...relSlugs, slugify(sub)]);
    }
  };

  walk(allKitsDir, []);
  return copies;
}

/**
 * Compute per-folder direct image-file counts from a flat list of relative
 * image storage paths (Requirement 5.2). Each path is attributed to its
 * immediate parent folder (its POSIX dirname). Pure.
 */
export function buildFolderCounts(
  imagePaths: readonly string[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const path of imagePaths) {
    const idx = path.lastIndexOf("/");
    const folder = idx >= 0 ? path.slice(0, idx) : "";
    counts[folder] = (counts[folder] ?? 0) + 1;
  }
  return counts;
}

/**
 * Assemble the full {@link ImageManifest} from planned products, kit-hero paths,
 * and the run summary (pure). {@link buildFolderCounts} is derived over every
 * image path (product images + kit-hero images) so folder counts reflect the
 * whole rebuilt tree (supports Property 20).
 */
export function assembleManifest(input: {
  products: ManifestProduct[];
  kitHeroImages: string[];
  summary: ManifestSummary;
  generatedAt?: string;
}): ImageManifest {
  const allImagePaths = [
    ...input.products.flatMap((product) => product.images),
    ...input.kitHeroImages,
  ];
  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    source: SOURCE_FOLDER,
    folderCounts: buildFolderCounts(allImagePaths),
    products: input.products,
    kitHeroImages: input.kitHeroImages,
    summary: input.summary,
  };
}

/** Skip counts split by category, for the completion summary (Req 6.3). */
export interface SkipCounts {
  /** `.mp4` files skipped. */
  mp4: number;
  /** Non-image, non-`.mp4` files skipped. */
  other: number;
}

/**
 * Recursively walk `dir` and count skipped files by category (Requirement 6),
 * logging each skipped path. `.mp4` files are counted separately from other
 * unsupported extensions (Req 6.1, 6.2, 6.3). Image files are not counted (they
 * are copied). Pure aside from the injected logger.
 */
export function countSkippedFiles(
  reader: DirReader,
  dir: string,
  log: CollisionLogger = () => {},
): SkipCounts {
  let mp4 = 0;
  let other = 0;

  const walk = (current: string): void => {
    for (const entry of reader.readDir(current)) {
      const childPath = join(current, entry.name);
      if (entry.isDirectory) {
        walk(childPath);
        continue;
      }
      const classification = classifyFile(entry.name);
      if (classification === "mp4") {
        mp4 += 1;
        log(`[skip:mp4] ${childPath}`);
      } else if (classification === "unsupported") {
        other += 1;
        const ext = extname(entry.name).toLowerCase() || "<none>";
        log(`[skip:other] ${childPath} (extension "${ext}")`);
      }
    }
  };

  walk(dir);
  return { mp4, other };
}

/** Count the number of directories in the tree rooted at `dir` (inclusive). */
export function countDirectories(reader: DirReader, dir: string): number {
  let count = 1;
  for (const entry of reader.readDir(dir)) {
    if (entry.isDirectory) {
      count += countDirectories(reader, join(dir, entry.name));
    }
  }
  return count;
}

/**
 * Delete every child of `dir` while preserving the `dir` folder itself
 * (Requirement 3.1). If `dir` does not exist it is created so subsequent copies
 * have a destination. The folder inode itself is never removed.
 */
export function clearDirectoryContents(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    return;
  }
  for (const name of readdirSync(dir)) {
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

/**
 * Orchestrate the full restructure (Requirements 3.1, 3.2, 3.5, 5.1, 5.2, 5.3, 6.3).
 *
 * Steps, in order:
 *   1. Assert the source folder exists BEFORE any deletion (Req 1.4) — nothing is
 *      removed if the source is missing.
 *   2. Clear the contents of `product-images/` while preserving the folder (Req 3.1).
 *   3. Resolve top-level folders; walk mapped collections in letter order (A→K),
 *      detect products, and plan slugified copies (Req 3.2).
 *   4. Gather Kit_Hero_Images from `ALL KITS` (Req 1.2).
 *   5. Perform every planned copy, preserving extensions (Req 3.3), tracking errors.
 *   6. Assemble and write `scripts/image-manifest.json` (Req 5.1, 5.2, 5.3).
 *   7. Log the completion summary (Req 3.5, 6.3).
 *
 * @param rootDir  Project root (defaults to the current working directory).
 */
export function main(rootDir: string = process.cwd()): ImageManifest {
  const log: CollisionLogger = (message) => console.log(message);

  // 1. Fail fast if the source is missing — before any destructive action.
  const sourcePath = assertSourceFolderExists(rootDir);
  const productImagesDir = join(rootDir, PRODUCT_IMAGES_DIR);

  // 2. Clear product-images/ contents, preserving the folder itself.
  clearDirectoryContents(productImagesDir);

  // 3. Resolve and partition the top-level source folders.
  const topLevelNames = fsDirReader
    .readDir(sourcePath)
    .filter((entry) => entry.isDirectory)
    .map((entry) => entry.name)
    .sort(compareNames);
  const resolution = resolveTopLevelFolders(topLevelNames, log);

  const allocator = new NameAllocator(log);
  const products: ManifestProduct[] = [];
  const copies: FileCopy[] = [];
  let foldersProcessed = 0;
  let filesSkippedMp4 = 0;
  let filesSkippedOther = 0;

  // Process collections in fixed letter order (A→K) for reproducible output.
  const orderedCollections = [...resolution.collections].sort((a, b) =>
    compareNames(a.collection.letter, b.collection.letter),
  );

  for (const { name, collection } of orderedCollections) {
    const collectionDir = join(sourcePath, name);
    foldersProcessed += countDirectories(fsDirReader, collectionDir);
    const skips = countSkippedFiles(fsDirReader, collectionDir, log);
    filesSkippedMp4 += skips.mp4;
    filesSkippedOther += skips.other;

    for (const product of detectProducts(fsDirReader, collectionDir, collection.letter)) {
      const plan = planProduct(product, collection.storageSlug, allocator);
      products.push(...plan.manifestProducts);
      copies.push(...plan.copies);
    }
  }

  // 4. Kit_Hero_Images from ALL KITS (not a collection).
  let kitHeroImages: string[] = [];
  if (resolution.kitHeroFolder !== null) {
    const allKitsDir = join(sourcePath, resolution.kitHeroFolder);
    foldersProcessed += countDirectories(fsDirReader, allKitsDir);
    const skips = countSkippedFiles(fsDirReader, allKitsDir, log);
    filesSkippedMp4 += skips.mp4;
    filesSkippedOther += skips.other;

    const kitCopies = planKitHeroImages(fsDirReader, allKitsDir, allocator);
    kitHeroImages = kitCopies.map((copy) => copy.destRelPath);
    copies.push(...kitCopies);
  }

  // 5. Perform the planned copies, preserving extensions; tally errors.
  let filesCopied = 0;
  let errors = 0;
  for (const copy of copies) {
    try {
      const destAbs = join(productImagesDir, copy.destRelPath);
      mkdirSync(dirname(destAbs), { recursive: true });
      copyFileSync(copy.sourceAbsPath, destAbs);
      filesCopied += 1;
    } catch (error) {
      errors += 1;
      const message = error instanceof Error ? error.message : String(error);
      log(`[error] failed to copy "${copy.sourceAbsPath}" → "${copy.destRelPath}": ${message}`);
    }
  }

  // 6. Assemble and write the manifest.
  const summary: ManifestSummary = {
    foldersProcessed,
    filesCopied,
    filesSkippedMp4,
    filesSkippedOther,
    errors,
    unmatchedTopLevelFolders: resolution.unmatched,
  };
  const manifest = assembleManifest({ products, kitHeroImages, summary });
  const manifestAbsPath = join(rootDir, MANIFEST_PATH);
  writeFileSync(manifestAbsPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  // 7. Completion summary.
  log(
    `[done] folders processed: ${foldersProcessed}, files copied: ${filesCopied}, ` +
      `skipped mp4: ${filesSkippedMp4}, skipped other: ${filesSkippedOther}, errors: ${errors}, ` +
      `products: ${products.length}, kit hero images: ${kitHeroImages.length}`,
  );

  return manifest;
}

/**
 * Run {@link main} only when this module is executed directly (e.g.
 * `tsx scripts/restructure-images.ts`), not when imported by tests. Guarded so
 * importing any exported symbol never triggers the destructive rebuild.
 */
function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(entry);
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  main();
}
