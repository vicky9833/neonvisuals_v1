/**
 * Integration tests for the restructure orchestrator (`main`) of the
 * restructure script (`scripts/restructure-images.ts`).
 *
 * Feature: image-catalog-rebuild — task 6.3.
 *
 * Unlike the pure-logic unit/property tests, these exercise the full pipeline
 * end-to-end against a real (temporary) filesystem fixture:
 *   - `clearDirectoryContents` deletes the old `product-images/` contents while
 *     preserving the `product-images/` folder itself (Req 3.1).
 *   - `main` copies detected images to their slugified destinations and reports
 *     accurate completion-summary counts (Req 3.5).
 *   - `main` returns (and writes) an `ImageManifest` with correct per-product
 *     records, kit-hero images, folder counts, and summary (Req 5.1).
 *
 * A self-contained `neonvisualsfinal/` fixture is built under `os.tmpdir()`
 * containing two mapped collections (flat + variant-set products), an `ALL KITS`
 * kit-hero source, an `.mp4`, and an unsupported file, plus a pre-existing
 * `product-images/` folder holding a sentinel file. The manifest is written to
 * `<tmpRoot>/scripts/image-manifest.json`, so a `scripts/` dir is created inside
 * the tmp root — the real repository `scripts/image-manifest.json` is never
 * touched. Assertions target the returned manifest object (and the file only
 * because it lives inside the tmp root). Temp dirs are removed in `afterEach`.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearDirectoryContents,
  main,
  MANIFEST_PATH,
  PRODUCT_IMAGES_DIR,
  SOURCE_FOLDER,
  type ImageManifest,
  type ManifestProduct,
} from "./restructure-images";

/* -------------------------------------------------------------------------- */
/* Fixture helpers                                                            */
/* -------------------------------------------------------------------------- */

/** Create a directory (recursively) and write a file with placeholder bytes. */
function writeFixtureFile(absPath: string, contents = "x"): void {
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, contents, "utf8");
}

/**
 * Build the temporary fixture root:
 *
 *   <root>/
 *     scripts/                              (so main can write the manifest here)
 *     product-images/
 *       STALE/old.txt                       (sentinel — must be cleared)
 *       stale-root-file.txt                 (sentinel — must be cleared)
 *     neonvisualsfinal/
 *       ON BOARDING KIT/                    (collection A, storageSlug "onboarding")
 *         COPPER BOTTLE/                    flat product
 *           Bottle Back.png
 *           Bottle Front.jpg
 *           demo video.mp4                  (skipped: mp4)
 *           notes.txt                       (skipped: unsupported)
 *         LEATHER JOURNAL/                  variant-set product
 *           SET 1/ { journal 1.webp, journal 2.webp }
 *           SET 2/ { journal a.jpeg }
 *       CLIENT APPRECIATION/                (collection E, storageSlug "client")
 *         CRYSTAL AWARD/                    variant-set product
 *           AWARD SET 1/ { award.png }
 *         MARBLE COASTER/                   flat product
 *           coaster.avif
 *       ALL KITS/                           kit-hero source (not a collection)
 *         hero 1.jpg
 *         clip.mp4                          (skipped: mp4)
 *         LIFESTYLE/ { shot.png }
 */
function buildFixture(root: string): void {
  // scripts/ so main's writeFileSync(join(root, "scripts/image-manifest.json")) succeeds.
  mkdirSync(join(root, "scripts"), { recursive: true });

  // Pre-existing product-images/ with sentinel content that must be cleared.
  writeFixtureFile(join(root, PRODUCT_IMAGES_DIR, "STALE", "old.txt"), "stale");
  writeFixtureFile(join(root, PRODUCT_IMAGES_DIR, "stale-root-file.txt"), "stale");

  const src = join(root, SOURCE_FOLDER);

  // Collection A — ON BOARDING KIT
  const onboarding = join(src, "ON BOARDING KIT");
  writeFixtureFile(join(onboarding, "COPPER BOTTLE", "Bottle Back.png"));
  writeFixtureFile(join(onboarding, "COPPER BOTTLE", "Bottle Front.jpg"));
  writeFixtureFile(join(onboarding, "COPPER BOTTLE", "demo video.mp4"));
  writeFixtureFile(join(onboarding, "COPPER BOTTLE", "notes.txt"));
  writeFixtureFile(join(onboarding, "LEATHER JOURNAL", "SET 1", "journal 1.webp"));
  writeFixtureFile(join(onboarding, "LEATHER JOURNAL", "SET 1", "journal 2.webp"));
  writeFixtureFile(join(onboarding, "LEATHER JOURNAL", "SET 2", "journal a.jpeg"));

  // Collection E — CLIENT APPRECIATION
  const client = join(src, "CLIENT APPRECIATION");
  writeFixtureFile(join(client, "CRYSTAL AWARD", "AWARD SET 1", "award.png"));
  writeFixtureFile(join(client, "MARBLE COASTER", "coaster.avif"));

  // ALL KITS — kit-hero source
  const allKits = join(src, "ALL KITS");
  writeFixtureFile(join(allKits, "hero 1.jpg"));
  writeFixtureFile(join(allKits, "clip.mp4"));
  writeFixtureFile(join(allKits, "LIFESTYLE", "shot.png"));
}

/** Find a manifest product by its slug (fails the test if absent). */
function productBySlug(manifest: ImageManifest, slug: string): ManifestProduct {
  const found = manifest.products.find((p) => p.productSlug === slug);
  if (found === undefined) {
    throw new Error(`expected a product with slug "${slug}" in the manifest`);
  }
  return found;
}

/* -------------------------------------------------------------------------- */

describe("image-catalog-rebuild 6.3 — main() integration on a fixture tree", () => {
  let root: string;

  beforeEach(() => {
    root = join(
      tmpdir(),
      `restructure-integration-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    buildFixture(root);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  /* ---- Req 3.1 — clear preserves the product-images/ folder ---- */

  it("clears the product-images/ contents while preserving the folder (Req 3.1)", () => {
    const productImagesDir = join(root, PRODUCT_IMAGES_DIR);

    main(root);

    // The folder itself survives...
    expect(existsSync(productImagesDir)).toBe(true);
    // ...but every pre-existing (stale) child is gone.
    expect(existsSync(join(productImagesDir, "STALE"))).toBe(false);
    expect(existsSync(join(productImagesDir, "stale-root-file.txt"))).toBe(false);
  });

  it("clearDirectoryContents preserves the folder inode and drops children", () => {
    const productImagesDir = join(root, PRODUCT_IMAGES_DIR);
    expect(existsSync(join(productImagesDir, "STALE", "old.txt"))).toBe(true);

    clearDirectoryContents(productImagesDir);

    expect(existsSync(productImagesDir)).toBe(true);
    expect(existsSync(join(productImagesDir, "STALE"))).toBe(false);
    expect(existsSync(join(productImagesDir, "stale-root-file.txt"))).toBe(false);
  });

  it("creates the product-images/ folder when it does not exist", () => {
    const productImagesDir = join(root, PRODUCT_IMAGES_DIR);
    rmSync(productImagesDir, { recursive: true, force: true });
    expect(existsSync(productImagesDir)).toBe(false);

    clearDirectoryContents(productImagesDir);

    expect(existsSync(productImagesDir)).toBe(true);
  });

  /* ---- Req 3.2 / 3.3 — files copied to slugified destinations ---- */

  it("copies detected images to their slugified destinations preserving extensions (Req 3.2, 3.3)", () => {
    main(root);
    const dir = join(root, PRODUCT_IMAGES_DIR);

    // Flat product (collection A) — no variant segment.
    expect(existsSync(join(dir, "onboarding", "copper-bottle", "bottle-back.png"))).toBe(true);
    expect(existsSync(join(dir, "onboarding", "copper-bottle", "bottle-front.jpg"))).toBe(true);
    // Variant-set product (collection A).
    expect(existsSync(join(dir, "onboarding", "leather-journal", "set-1", "journal-1.webp"))).toBe(true);
    expect(existsSync(join(dir, "onboarding", "leather-journal", "set-1", "journal-2.webp"))).toBe(true);
    expect(existsSync(join(dir, "onboarding", "leather-journal", "set-2", "journal-a.jpeg"))).toBe(true);
    // Collection E products.
    expect(existsSync(join(dir, "client", "crystal-award", "award-set-1", "award.png"))).toBe(true);
    expect(existsSync(join(dir, "client", "marble-coaster", "coaster.avif"))).toBe(true);
    // Kit-hero images under the dedicated all-kits slug.
    expect(existsSync(join(dir, "all-kits", "hero-1.jpg"))).toBe(true);
    expect(existsSync(join(dir, "all-kits", "lifestyle", "shot.png"))).toBe(true);

    // Skipped files are never copied.
    expect(existsSync(join(dir, "onboarding", "copper-bottle", "demo-video.mp4"))).toBe(false);
    expect(existsSync(join(dir, "onboarding", "copper-bottle", "notes.txt"))).toBe(false);
    expect(existsSync(join(dir, "all-kits", "clip.mp4"))).toBe(false);
  });

  /* ---- Req 3.5 / 6.3 — accurate completion-summary counts ---- */

  it("reports accurate completion-summary counts (Req 3.5, 6.3)", () => {
    const manifest = main(root);
    const { summary } = manifest;

    // Directories traversed: A (5) + E (4) + ALL KITS (2) = 11.
    expect(summary.foldersProcessed).toBe(11);
    // Images copied: A (2 + 3) + E (1 + 1) + kit-hero (2) = 9.
    expect(summary.filesCopied).toBe(9);
    // .mp4 skips counted separately: COPPER BOTTLE + ALL KITS = 2.
    expect(summary.filesSkippedMp4).toBe(2);
    // Other unsupported skips: notes.txt = 1.
    expect(summary.filesSkippedOther).toBe(1);
    expect(summary.errors).toBe(0);
    expect(summary.unmatchedTopLevelFolders).toEqual([]);
  });

  /* ---- Req 5.1 — manifest written with correct product records ---- */

  it("writes the manifest and returns product records matching the copied tree (Req 5.1)", () => {
    const manifest = main(root);

    expect(manifest.source).toBe(SOURCE_FOLDER);
    // Leaf-folder model: every leaf folder is its own product. The two flat
    // products stay one record each; each variant-set folder is split into one
    // record per variant leaf. So:
    //   A: COPPER BOTTLE (flat) -> 1; LEATHER JOURNAL {SET 1, SET 2} -> 2
    //   E: CRYSTAL AWARD {AWARD SET 1} -> 1; MARBLE COASTER (flat) -> 1
    // Total = 5.
    expect(manifest.products).toHaveLength(5);

    // Products are ordered collection-major (A->E), source-order within, and
    // each split leaf is emitted in its parent's variant order.
    expect(manifest.products.map((p) => p.productSlug)).toEqual([
      "copper-bottle",
      "set-1",
      "set-2",
      "award-set-1",
      "marble-coaster",
    ]);

    // Flat product (collection A): no variant sets, images in slug order.
    const copper = productBySlug(manifest, "copper-bottle");
    expect(copper.collectionLetter).toBe("A");
    expect(copper.storageSlug).toBe("onboarding");
    expect(copper.variantSets).toEqual([]);
    expect(copper.images).toEqual([
      "onboarding/copper-bottle/bottle-back.png",
      "onboarding/copper-bottle/bottle-front.jpg",
    ]);
    expect(copper.milestone).toBeUndefined();

    // Split variant-set product (collection A): each leaf is its own flat
    // product owning only its own images. Storage keys are byte-identical to the
    // pre-split layout (still under leather-journal/<variant>/...), so no
    // re-upload is required.
    const set1 = productBySlug(manifest, "set-1");
    expect(set1.collectionLetter).toBe("A");
    expect(set1.storageSlug).toBe("onboarding");
    expect(set1.variantSets).toEqual([]);
    expect(set1.sourcePath.endsWith(join("LEATHER JOURNAL", "SET 1"))).toBe(true);
    expect(set1.images).toEqual([
      "onboarding/leather-journal/set-1/journal-1.webp",
      "onboarding/leather-journal/set-1/journal-2.webp",
    ]);

    const set2 = productBySlug(manifest, "set-2");
    expect(set2.collectionLetter).toBe("A");
    expect(set2.variantSets).toEqual([]);
    expect(set2.sourcePath.endsWith(join("LEATHER JOURNAL", "SET 2"))).toBe(true);
    expect(set2.images).toEqual([
      "onboarding/leather-journal/set-2/journal-a.jpeg",
    ]);

    // Collection E products. The single-variant CRYSTAL AWARD becomes its leaf
    // (AWARD SET 1) as its own flat product; the storage key is unchanged.
    const crystal = productBySlug(manifest, "award-set-1");
    expect(crystal.collectionLetter).toBe("E");
    expect(crystal.storageSlug).toBe("client");
    expect(crystal.variantSets).toEqual([]);
    expect(crystal.sourcePath.endsWith(join("CRYSTAL AWARD", "AWARD SET 1"))).toBe(true);
    expect(crystal.images).toEqual(["client/crystal-award/award-set-1/award.png"]);

    const coaster = productBySlug(manifest, "marble-coaster");
    expect(coaster.collectionLetter).toBe("E");
    expect(coaster.variantSets).toEqual([]);
    expect(coaster.images).toEqual(["client/marble-coaster/coaster.avif"]);

    // Kit-hero images gathered from ALL KITS (not a collection).
    expect(manifest.kitHeroImages).toEqual([
      "all-kits/hero-1.jpg",
      "all-kits/lifestyle/shot.png",
    ]);

    // Folder counts reflect the whole rebuilt tree (product + kit-hero images).
    expect(manifest.folderCounts["onboarding/copper-bottle"]).toBe(2);
    expect(manifest.folderCounts["onboarding/leather-journal/set-1"]).toBe(2);
    expect(manifest.folderCounts["onboarding/leather-journal/set-2"]).toBe(1);
    expect(manifest.folderCounts["client/crystal-award/award-set-1"]).toBe(1);
    expect(manifest.folderCounts["client/marble-coaster"]).toBe(1);
    expect(manifest.folderCounts["all-kits"]).toBe(1);
    expect(manifest.folderCounts["all-kits/lifestyle"]).toBe(1);
  });

  it("persists the manifest to <root>/scripts/image-manifest.json matching the return value (Req 5.1)", () => {
    const returned = main(root);

    // The manifest file lives inside the tmp root (never the real scripts/ dir).
    const manifestPath = join(root, MANIFEST_PATH);
    expect(existsSync(manifestPath)).toBe(true);

    const onDisk = JSON.parse(readFileSync(manifestPath, "utf8")) as ImageManifest;
    expect(onDisk.products).toEqual(returned.products);
    expect(onDisk.kitHeroImages).toEqual(returned.kitHeroImages);
    expect(onDisk.summary).toEqual(returned.summary);
    expect(onDisk.folderCounts).toEqual(returned.folderCounts);
  });
});
