/**
 * Property-based tests for the product-level folder detection logic of the
 * restructure script (`scripts/restructure-images.ts`).
 *
 * Feature: image-catalog-rebuild — Property 4.
 *
 * Property 4 (design §Correctness Properties): "Product-folder detection is
 * correct across tree shapes." For any generated folder tree, `detectProducts`
 * emits exactly one Product_Folder for each directory that contains only image
 * files or whose immediate subfolders each contain only image files, recursing
 * through deeper nesting; and for each emitted product the recorded collection
 * letter, variant-set order, and image order are the stable-sorted structure of
 * that folder.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 5.3.
 *
 * The tests drive `detectProducts` through an in-memory {@link DirReader} built
 * from a fast-check-generated tree, so no filesystem access is required. A
 * reference oracle derived independently from the requirement rules is compared
 * against the implementation across many tree shapes. Additional focused
 * properties assert the flat-image rule (2.1), the variant-set rule (2.2),
 * deterministic stable ordering (2.4, 5.3), and collection-B tenure threading.
 *
 * Each property runs >= 100 iterations via fast-check.
 */

import { basename, join } from "node:path";
import { describe, it, expect } from "vitest";
import fc from "fast-check";

import {
  detectProducts,
  isImageFile,
  compareNames,
  TENURE_FOLDERS,
  type DirEntry,
  type DirReader,
  type DetectedProduct,
  type DetectedVariantSet,
} from "./restructure-images";
import type { BucketCode, MilestoneTenure } from "../src/lib/types/product";

const NUM_RUNS = 150;

/* -------------------------------------------------------------------------- */
/* In-memory tree model + DirReader                                            */
/* -------------------------------------------------------------------------- */

interface FileNode {
  type: "file";
  name: string;
}
interface DirNode {
  type: "dir";
  name: string;
  children: TreeNode[];
}
type TreeNode = FileNode | DirNode;

/**
 * Deduplicate sibling entries by name (a real filesystem cannot hold two
 * children with the same name in one directory). The first occurrence wins so
 * the canonical tree is stable regardless of later ordering changes.
 */
function normalize(children: readonly TreeNode[]): TreeNode[] {
  const seen = new Set<string>();
  const out: TreeNode[] = [];
  for (const child of children) {
    if (seen.has(child.name)) continue;
    seen.add(child.name);
    if (child.type === "dir") {
      out.push({ type: "dir", name: child.name, children: normalize(child.children) });
    } else {
      out.push({ type: "file", name: child.name });
    }
  }
  return out;
}

/**
 * An in-memory {@link DirReader} built from a normalized tree. `reversed` lists
 * every directory's entries in reverse insertion order, used to prove the
 * detector's output is independent of the reader's ordering (stable sort).
 */
class InMemoryDirReader implements DirReader {
  private readonly map = new Map<string, DirEntry[]>();

  constructor(rootPath: string, children: readonly TreeNode[], reversed = false) {
    this.register(rootPath, children, reversed);
  }

  private register(dirPath: string, children: readonly TreeNode[], reversed: boolean): void {
    const ordered = reversed ? [...children].reverse() : [...children];
    this.map.set(
      dirPath,
      ordered.map((child) => ({ name: child.name, isDirectory: child.type === "dir" })),
    );
    for (const child of children) {
      if (child.type === "dir") {
        this.register(join(dirPath, child.name), child.children, reversed);
      }
    }
  }

  readDir(dirPath: string): DirEntry[] {
    return this.map.get(dirPath) ?? [];
  }
}

/* -------------------------------------------------------------------------- */
/* Reference oracle (independent restatement of Requirements 2.1–2.4)          */
/* -------------------------------------------------------------------------- */

interface OracleCtx {
  letter: BucketCode;
  tenureSegment?: string;
  milestone?: MilestoneTenure;
}

function makeProduct(
  dir: string,
  ctx: OracleCtx,
  variantSets: DetectedVariantSet[],
  images: string[],
): DetectedProduct {
  const product: DetectedProduct = {
    collectionLetter: ctx.letter,
    productPath: dir,
    productName: basename(dir),
    variantSets,
    images,
  };
  if (ctx.tenureSegment !== undefined) product.tenureSegment = ctx.tenureSegment;
  if (ctx.milestone !== undefined) product.milestone = ctx.milestone;
  return product;
}

/** Stable-sorted image file names directly inside `dir`. */
function imagesIn(reader: DirReader, dir: string): string[] {
  return reader
    .readDir(dir)
    .filter((entry) => !entry.isDirectory && isImageFile(entry.name))
    .map((entry) => entry.name)
    .sort(compareNames);
}

/** Stable-sorted immediate subdirectory names of `dir`. */
function subdirsIn(reader: DirReader, dir: string): string[] {
  return reader
    .readDir(dir)
    .filter((entry) => entry.isDirectory)
    .map((entry) => entry.name)
    .sort(compareNames);
}

function hasSubdirs(reader: DirReader, dir: string): boolean {
  return reader.readDir(dir).some((entry) => entry.isDirectory);
}

/**
 * The reference detector. Restates the requirement rules directly:
 *   - Req 2.1: a directory with no subfolders and >=1 image → one flat product.
 *   - Collection B tenure (Req 3.4 / 15.2): thread the tenure segment before the
 *     variant rule so tenure folders are never mistaken for variant sets.
 *   - Req 2.2: every immediate subfolder is itself a leaf → one variant product.
 *   - Req 2.3: otherwise recurse into each subfolder.
 * Ordering everywhere uses {@link compareNames} (Req 2.4, 5.3).
 */
function oracle(reader: DirReader, dir: string, ctx: OracleCtx, out: DetectedProduct[]): void {
  const images = imagesIn(reader, dir);
  const subdirs = subdirsIn(reader, dir);

  if (subdirs.length === 0) {
    if (images.length > 0) out.push(makeProduct(dir, ctx, [], images));
    return;
  }

  if (
    ctx.letter === "B" &&
    ctx.tenureSegment === undefined &&
    subdirs.some((name) => TENURE_FOLDERS[name] !== undefined)
  ) {
    for (const name of subdirs) {
      const tenure = TENURE_FOLDERS[name];
      const childCtx: OracleCtx =
        tenure !== undefined
          ? { letter: "B", tenureSegment: tenure.segment, milestone: tenure.milestone }
          : ctx;
      oracle(reader, join(dir, name), childCtx, out);
    }
    return;
  }

  const everySubdirIsLeaf = subdirs.every((name) => !hasSubdirs(reader, join(dir, name)));
  if (everySubdirIsLeaf) {
    const variantSets: DetectedVariantSet[] = subdirs.map((name) => ({
      name,
      images: imagesIn(reader, join(dir, name)),
    }));
    out.push(makeProduct(dir, ctx, variantSets, []));
    return;
  }

  for (const name of subdirs) {
    oracle(reader, join(dir, name), ctx, out);
  }
}

function expectedProducts(reader: DirReader, root: string, letter: BucketCode): DetectedProduct[] {
  const out: DetectedProduct[] = [];
  oracle(reader, root, { letter }, out);
  return out;
}

/* -------------------------------------------------------------------------- */
/* fast-check generators for tree shapes                                       */
/* -------------------------------------------------------------------------- */

// File names mixing image extensions (detected) and non-image ones (ignored),
// with a small base pool so ordering and collisions vary.
const fileNameArb = fc
  .tuple(
    fc.constantFrom("img", "photo", "a", "b", "c", "1", "2", "z"),
    fc.constantFrom(".jpg", ".jpeg", ".png", ".webp", ".avif", ".txt", ".mp4"),
  )
  .map(([base, ext]) => `${base}${ext}`);

// Directory names include the collection-B tenure folder names so the tenure
// branch is exercised, alongside ordinary variant/group names.
const dirNameArb = fc.constantFrom(
  "alpha",
  "beta",
  "gamma",
  "set-1",
  "set-2",
  "group",
  "ONE YEAR",
  "FIVE YEAR",
  "TEN YEAR",
);

const { node } = fc.letrec<{ leaf: TreeNode; node: TreeNode }>((tie) => ({
  leaf: fc.record({ type: fc.constant("file" as const), name: fileNameArb }),
  node: fc.oneof(
    { maxDepth: 3, depthSize: "small" },
    tie("leaf"),
    fc.record({
      type: fc.constant("dir" as const),
      name: dirNameArb,
      children: fc.array(tie("node"), { maxLength: 4 }),
    }),
  ),
}));

/** A whole tree: the (deduped) children of the synthetic root directory. */
const treeArb: fc.Arbitrary<TreeNode[]> = fc
  .array(node, { maxLength: 5 })
  .map((children) => normalize(children));

const letterArb = fc.constantFrom<BucketCode>("A", "B", "G", "K");

const ROOT = "root";

/* -------------------------------------------------------------------------- */
/* Property 4 — main model-based equivalence                                   */
/* -------------------------------------------------------------------------- */

describe("Feature: image-catalog-rebuild, Property 4 — product-folder detection is correct across tree shapes", () => {
  it("matches the independent reference detector for arbitrary trees (Req 2.1, 2.2, 2.3, 2.4)", () => {
    fc.assert(
      fc.property(treeArb, letterArb, (children, letter) => {
        const reader = new InMemoryDirReader(ROOT, children);
        const actual = detectProducts(reader, ROOT, letter);
        const expected = expectedProducts(reader, ROOT, letter);
        expect(actual).toEqual(expected);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("records the owning collection letter on every detected product (Req 2.4)", () => {
    fc.assert(
      fc.property(treeArb, letterArb, (children, letter) => {
        const reader = new InMemoryDirReader(ROOT, children);
        for (const product of detectProducts(reader, ROOT, letter)) {
          expect(product.collectionLetter).toBe(letter);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("keeps every product's images and variant sets stable-sorted (Req 2.4, 5.3)", () => {
    fc.assert(
      fc.property(treeArb, letterArb, (children, letter) => {
        const reader = new InMemoryDirReader(ROOT, children);
        for (const product of detectProducts(reader, ROOT, letter)) {
          // Flat products carry sorted images; variant products carry [] here.
          expect(product.images).toEqual([...product.images].sort(compareNames));
          const names = product.variantSets.map((variant) => variant.name);
          expect(names).toEqual([...names].sort(compareNames));
          for (const variant of product.variantSets) {
            expect(variant.images).toEqual([...variant.images].sort(compareNames));
            // Only image files ever appear.
            for (const image of variant.images) expect(isImageFile(image)).toBe(true);
          }
          for (const image of product.images) expect(isImageFile(image)).toBe(true);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("is independent of the reader's entry ordering (deterministic stable sort — Req 2.4, 5.3)", () => {
    fc.assert(
      fc.property(treeArb, letterArb, (children, letter) => {
        const forward = new InMemoryDirReader(ROOT, children, false);
        const reversed = new InMemoryDirReader(ROOT, children, true);
        expect(detectProducts(reversed, ROOT, letter)).toEqual(
          detectProducts(forward, ROOT, letter),
        );
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Property 4 — focused rule checks                                            */
/* -------------------------------------------------------------------------- */

describe("Feature: image-catalog-rebuild, Property 4 — flat-image folders (Req 2.1)", () => {
  it("classifies a folder of only images as exactly one flat product with sorted images", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fileNameArb, { minLength: 1, maxLength: 8 }),
        letterArb,
        (files, letter) => {
          const imageFiles = files.filter((name) => isImageFile(name));
          fc.pre(imageFiles.length > 0);

          const children: TreeNode[] = files.map((name) => ({ type: "file", name }));
          const reader = new InMemoryDirReader(ROOT, children);
          const products = detectProducts(reader, ROOT, letter);

          expect(products).toHaveLength(1);
          const [product] = products;
          expect(product.variantSets).toEqual([]);
          expect(product.collectionLetter).toBe(letter);
          // Images are exactly the image files, stable-sorted; non-image files dropped.
          expect(product.images).toEqual([...imageFiles].sort(compareNames));
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("emits no product for a folder with no image files", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.constantFrom("readme.txt", "clip.mp4", "notes.md"), {
          minLength: 1,
          maxLength: 3,
        }),
        letterArb,
        (files, letter) => {
          const children: TreeNode[] = files.map((name) => ({ type: "file", name }));
          const reader = new InMemoryDirReader(ROOT, children);
          expect(detectProducts(reader, ROOT, letter)).toEqual([]);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("Feature: image-catalog-rebuild, Property 4 — variant-set folders (Req 2.2)", () => {
  it("classifies a folder whose subfolders each hold only images as one variant product", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.record({
            name: fc.constantFrom("alpha", "beta", "gamma", "set-1", "set-2", "group"),
            files: fc.uniqueArray(fileNameArb, { minLength: 1, maxLength: 5 }),
          }),
          { selector: (variant) => variant.name, minLength: 1, maxLength: 4 },
        ),
        // Use a non-B collection so tenure handling never intercepts.
        fc.constantFrom<BucketCode>("A", "G", "K"),
        (variants, letter) => {
          const children: TreeNode[] = variants.map((variant) => ({
            type: "dir",
            name: variant.name,
            children: variant.files.map((name) => ({ type: "file", name })),
          }));
          const reader = new InMemoryDirReader(ROOT, children);
          const products = detectProducts(reader, ROOT, letter);

          expect(products).toHaveLength(1);
          const [product] = products;
          expect(product.images).toEqual([]);

          const expectedNames = variants.map((variant) => variant.name).sort(compareNames);
          expect(product.variantSets.map((variant) => variant.name)).toEqual(expectedNames);

          for (const variant of product.variantSets) {
            const source = variants.find((candidate) => candidate.name === variant.name);
            const expectedImages = (source?.files ?? [])
              .filter((name) => isImageFile(name))
              .sort(compareNames);
            expect(variant.images).toEqual(expectedImages);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("Feature: image-catalog-rebuild, Property 4 — collection B tenure threading (Req 2.4, milestone)", () => {
  it("threads the tenure segment and milestone through recognised tenure subfolders", () => {
    const tenureNames = Object.keys(TENURE_FOLDERS);
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.constantFrom(...tenureNames), { minLength: 1, maxLength: 3 }),
        fc.uniqueArray(fileNameArb, { minLength: 1, maxLength: 4 }),
        (tenures, files) => {
          fc.pre(files.some((name) => isImageFile(name)));

          // Each tenure folder contains one product folder of images.
          const children: TreeNode[] = tenures.map((tenureName) => ({
            type: "dir",
            name: tenureName,
            children: [
              {
                type: "dir",
                name: "the-product",
                children: files.map((name) => ({ type: "file", name })),
              },
            ],
          }));
          const reader = new InMemoryDirReader(ROOT, children);
          const products = detectProducts(reader, ROOT, "B");

          expect(products).toHaveLength(tenures.length);
          for (const product of products) {
            expect(product.collectionLetter).toBe("B");
            // The tenure segment/milestone must be set and consistent with the map.
            const match = Object.values(TENURE_FOLDERS).find(
              (entry) => entry.segment === product.tenureSegment,
            );
            expect(match).toBeDefined();
            expect(product.milestone).toBe(match?.milestone);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
