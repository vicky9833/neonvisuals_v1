/**
 * Unit tests for special source-file handling in the restructure script
 * (`scripts/restructure-images.ts`).
 *
 * Feature: image-catalog-rebuild — task 5.3.
 *
 * These cover the pure file-extension classification and the recursive
 * skip-counting logic (no real filesystem side effects — an in-memory
 * {@link DirReader} is used):
 *   - `.mp4` files are skipped, never copied, and their paths are logged (Req 6.1).
 *   - Files whose extension is neither an Image_Extension nor `.mp4` are skipped
 *     and logged with their extension (Req 6.2).
 *   - `.mp4` skips are counted separately from other skipped files (Req 6.3).
 */

import { join } from "node:path";

import { describe, it, expect } from "vitest";

import {
  classifyFile,
  countSkippedFiles,
  MP4_EXT,
  type DirEntry,
  type DirReader,
} from "./restructure-images";

/* -------------------------------------------------------------------------- */
/* In-memory directory tree + DirReader                                        */
/* -------------------------------------------------------------------------- */

/**
 * A recursive in-memory fixture tree. A `null` value denotes a file; a nested
 * object denotes a directory whose keys are its child entry names.
 */
interface Tree {
  [name: string]: Tree | null;
}

/**
 * Build a {@link DirReader} over an in-memory {@link Tree} rooted at `rootPath`.
 *
 * Paths are keyed with the same `join` the production code uses, so lookups made
 * by `countSkippedFiles` (which joins with `entry.name`) resolve correctly on
 * any platform.
 */
function makeReader(rootPath: string, tree: Tree): DirReader {
  const dirs = new Map<string, DirEntry[]>();

  const index = (path: string, node: Tree): void => {
    const entries: DirEntry[] = [];
    for (const [name, child] of Object.entries(node)) {
      const isDirectory = child !== null;
      entries.push({ name, isDirectory });
      if (child !== null) {
        index(join(path, name), child);
      }
    }
    dirs.set(path, entries);
  };

  index(rootPath, tree);

  return {
    readDir(dirPath: string): DirEntry[] {
      return dirs.get(dirPath) ?? [];
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Req 6.1, 6.2 — classifyFile                                                 */
/* -------------------------------------------------------------------------- */

describe("image-catalog-rebuild 5.3 — classifyFile (Req 6.1, 6.2)", () => {
  it("classifies every supported image extension as \"image\"", () => {
    for (const name of [
      "photo.webp",
      "photo.jpg",
      "photo.jpeg",
      "photo.avif",
      "photo.png",
    ]) {
      expect(classifyFile(name)).toBe("image");
    }
  });

  it("classifies image extensions case-insensitively", () => {
    expect(classifyFile("PHOTO.JPG")).toBe("image");
    expect(classifyFile("Hero.WebP")).toBe("image");
    expect(classifyFile("shot.PNG")).toBe("image");
  });

  it("classifies .mp4 files as \"mp4\" (Req 6.1)", () => {
    expect(classifyFile("clip.mp4")).toBe("mp4");
    expect(classifyFile("CLIP.MP4")).toBe("mp4");
  });

  it("classifies unsupported extensions as \"unsupported\" (Req 6.2)", () => {
    for (const name of [
      "notes.txt",
      "archive.zip",
      "raw.tiff",
      "graphic.gif",
      "doc.pdf",
      "video.mov",
    ]) {
      expect(classifyFile(name)).toBe("unsupported");
    }
  });

  it("classifies a file with no extension as \"unsupported\"", () => {
    expect(classifyFile("README")).toBe("unsupported");
    expect(classifyFile(".DS_Store")).toBe("unsupported");
  });

  it("recognises the exact .mp4 extension constant", () => {
    expect(MP4_EXT).toBe(".mp4");
  });
});

/* -------------------------------------------------------------------------- */
/* Req 6.1, 6.2, 6.3 — countSkippedFiles over a fixture tree                   */
/* -------------------------------------------------------------------------- */

describe("image-catalog-rebuild 5.3 — countSkippedFiles (Req 6.1, 6.2, 6.3)", () => {
  const ROOT = join("neonvisualsfinal", "ON BOARDING KIT");

  /**
   * A fixture tree mixing images (never counted as skips), `.mp4` videos, and
   * assorted unsupported files across nested folders.
   */
  const tree: Tree = {
    "hero.webp": null, // image — not a skip
    "promo.mp4": null, // mp4 skip
    "notes.txt": null, // other skip
    "COFFEE MUG": {
      "mug-1.jpg": null, // image — not a skip
      "mug-2.png": null, // image — not a skip
      "walkthrough.mp4": null, // mp4 skip
      "spec.pdf": null, // other skip
    },
    "DESK PLANT": {
      "plant.avif": null, // image — not a skip
      ".DS_Store": null, // other skip (no supported extension)
      NESTED: {
        "deep.mp4": null, // mp4 skip (nested)
        "thumbs.db": null, // other skip (nested)
        "shot.jpeg": null, // image — not a skip
      },
    },
  };

  it("counts .mp4 skips separately from other skips (Req 6.3)", () => {
    const reader = makeReader(ROOT, tree);
    const counts = countSkippedFiles(reader, ROOT);

    // .mp4: promo.mp4, walkthrough.mp4, deep.mp4
    expect(counts.mp4).toBe(3);
    // other: notes.txt, spec.pdf, .DS_Store, thumbs.db
    expect(counts.other).toBe(4);
  });

  it("does not count image files as skips (Req 6.1, 6.2)", () => {
    // hero.webp, mug-1.jpg, mug-2.png, plant.avif, shot.jpeg = 5 images.
    // A tree with only images yields zero skips of either kind.
    const imagesOnly: Tree = {
      "a.webp": null,
      "b.jpg": null,
      SUB: { "c.png": null, "d.avif": null, "e.jpeg": null },
    };
    const reader = makeReader(ROOT, imagesOnly);
    const counts = countSkippedFiles(reader, ROOT);

    expect(counts).toEqual({ mp4: 0, other: 0 });
  });

  it("logs each skipped path, tagging mp4 and other separately (Req 6.1, 6.2)", () => {
    const logged: string[] = [];
    const reader = makeReader(ROOT, tree);
    countSkippedFiles(reader, ROOT, (message) => logged.push(message));

    const mp4Logs = logged.filter((line) => line.startsWith("[skip:mp4]"));
    const otherLogs = logged.filter((line) => line.startsWith("[skip:other]"));

    // One log line per skipped file, split by category.
    expect(mp4Logs).toHaveLength(3);
    expect(otherLogs).toHaveLength(4);
    // Total log lines equal total skips (no image was logged).
    expect(logged).toHaveLength(7);

    // mp4 logs name the skipped video paths.
    expect(mp4Logs.some((line) => line.includes(join(ROOT, "promo.mp4")))).toBe(true);
    expect(
      mp4Logs.some((line) => line.includes(join(ROOT, "COFFEE MUG", "walkthrough.mp4"))),
    ).toBe(true);

    // other logs include the offending extension (Req 6.2).
    expect(otherLogs.some((line) => line.includes('"') && line.includes(".txt"))).toBe(true);
    expect(otherLogs.some((line) => line.includes(".pdf"))).toBe(true);
  });

  it("returns zero skips for an empty tree", () => {
    const reader = makeReader(ROOT, {});
    expect(countSkippedFiles(reader, ROOT)).toEqual({ mp4: 0, other: 0 });
  });
});
