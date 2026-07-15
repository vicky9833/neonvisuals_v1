/**
 * Unit tests for the collection mapping and top-level folder guards of the
 * restructure script (`scripts/restructure-images.ts`).
 *
 * Feature: image-catalog-rebuild — task 4.2.
 *
 * These cover the pure mapping/guard logic (no filesystem copy side effects):
 *   - The full, fixed 11-entry `COLLECTION_MAP` (Req 1.1).
 *   - `ALL KITS` is treated as a Kit_Hero_Images source, never a collection (Req 1.2).
 *   - Unmatched top-level folders are logged and excluded (Req 1.3).
 *   - A missing source folder fails fast with a descriptive error (Req 1.4).
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, it, expect, afterAll } from "vitest";

import {
  COLLECTION_MAP,
  resolveTopLevelFolder,
  resolveTopLevelFolders,
  assertSourceFolderExists,
  MissingSourceFolderError,
  SOURCE_FOLDER,
  ALL_KITS_FOLDER,
  type CollectionMap,
} from "./restructure-images";

/* -------------------------------------------------------------------------- */
/* Req 1.1 — the fixed 11-entry collection mapping                             */
/* -------------------------------------------------------------------------- */

/**
 * The authoritative expected mapping, transcribed directly from Requirement 1.1
 * (and the design's COLLECTION_MAP table), keyed by the EXACT source folder name.
 */
const EXPECTED_MAP: Record<string, CollectionMap> = {
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

describe("image-catalog-rebuild 4.2 — COLLECTION_MAP (Req 1.1)", () => {
  it("defines exactly 11 collections", () => {
    expect(Object.keys(COLLECTION_MAP)).toHaveLength(11);
  });

  it("matches the fixed mapping table entry-for-entry", () => {
    expect(COLLECTION_MAP).toEqual(EXPECTED_MAP);
  });

  it("assigns each of the letters A–K exactly once", () => {
    const letters = Object.values(COLLECTION_MAP).map((c) => c.letter).sort();
    expect(letters).toEqual(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"]);
  });

  it("uses unique, URL-safe storage slugs", () => {
    const slugs = Object.values(COLLECTION_MAP).map((c) => c.storageSlug);
    // All slugs are unique.
    expect(new Set(slugs).size).toBe(slugs.length);
    // Every slug contains only [a-z0-9-].
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("does not contain an ALL KITS entry (Req 1.2)", () => {
    expect(COLLECTION_MAP[ALL_KITS_FOLDER]).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */
/* Req 1.1–1.3 — single-folder resolution                                      */
/* -------------------------------------------------------------------------- */

describe("image-catalog-rebuild 4.2 — resolveTopLevelFolder (Req 1.1–1.3)", () => {
  it("resolves every mapped folder name to its collection", () => {
    for (const [name, expected] of Object.entries(EXPECTED_MAP)) {
      const resolution = resolveTopLevelFolder(name);
      expect(resolution).toEqual({ kind: "collection", name, collection: expected });
    }
  });

  it("resolves ALL KITS to a kit-hero source, not a collection (Req 1.2)", () => {
    const resolution = resolveTopLevelFolder(ALL_KITS_FOLDER);
    expect(resolution).toEqual({ kind: "kit-hero", name: ALL_KITS_FOLDER });
  });

  it("resolves an unknown folder to unmatched (Req 1.3)", () => {
    const resolution = resolveTopLevelFolder("SOME RANDOM FOLDER");
    expect(resolution).toEqual({ kind: "unmatched", name: "SOME RANDOM FOLDER" });
  });

  it("is case-sensitive: a differently-cased known name is unmatched", () => {
    const resolution = resolveTopLevelFolder("on boarding kit");
    expect(resolution.kind).toBe("unmatched");
  });
});

/* -------------------------------------------------------------------------- */
/* Req 1.2, 1.3 — partitioning a set of top-level folders                       */
/* -------------------------------------------------------------------------- */

describe("image-catalog-rebuild 4.2 — resolveTopLevelFolders (Req 1.2, 1.3)", () => {
  it("partitions collections, the kit-hero folder, and unmatched folders", () => {
    const logged: string[] = [];
    const result = resolveTopLevelFolders(
      [
        "ON BOARDING KIT",
        ALL_KITS_FOLDER,
        "MYSTERY FOLDER",
        "VISITING CARD",
        ".DS_Store",
      ],
      (message) => logged.push(message),
    );

    // Collections preserve input order and carry their mapping.
    expect(result.collections).toEqual([
      { name: "ON BOARDING KIT", collection: EXPECTED_MAP["ON BOARDING KIT"] },
      { name: "VISITING CARD", collection: EXPECTED_MAP["VISITING CARD"] },
    ]);

    // ALL KITS is captured as the kit-hero source, not a collection (Req 1.2).
    expect(result.kitHeroFolder).toBe(ALL_KITS_FOLDER);

    // Unmatched folders are excluded from collections and reported (Req 1.3).
    expect(result.unmatched).toEqual(["MYSTERY FOLDER", ".DS_Store"]);
  });

  it("logs each unmatched folder name (Req 1.3)", () => {
    const logged: string[] = [];
    resolveTopLevelFolders(["MYSTERY FOLDER", "ANOTHER ODD ONE"], (message) =>
      logged.push(message),
    );

    // One log line per unmatched folder, each naming the folder.
    expect(logged).toHaveLength(2);
    expect(logged.some((line) => line.includes("MYSTERY FOLDER"))).toBe(true);
    expect(logged.some((line) => line.includes("ANOTHER ODD ONE"))).toBe(true);
  });

  it("does not log for mapped collections or the kit-hero folder", () => {
    const logged: string[] = [];
    resolveTopLevelFolders(["ON BOARDING KIT", ALL_KITS_FOLDER], (message) =>
      logged.push(message),
    );
    expect(logged).toHaveLength(0);
  });

  it("reports no kit-hero folder when ALL KITS is absent", () => {
    const result = resolveTopLevelFolders(["ON BOARDING KIT"], () => {});
    expect(result.kitHeroFolder).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Req 1.4 — missing-source-folder guard                                        */
/* -------------------------------------------------------------------------- */

describe("image-catalog-rebuild 4.2 — assertSourceFolderExists (Req 1.4)", () => {
  const tempRoots: string[] = [];

  afterAll(() => {
    for (const dir of tempRoots) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function makeTempRoot(): string {
    const dir = mkdtempSync(join(tmpdir(), "restructure-guard-"));
    tempRoots.push(dir);
    return dir;
  }

  it("returns the resolved source path when the folder exists", () => {
    const root = makeTempRoot();
    const sourcePath = join(root, SOURCE_FOLDER);
    mkdirSync(sourcePath);

    expect(assertSourceFolderExists(root)).toBe(sourcePath);
  });

  it("throws a descriptive MissingSourceFolderError when the folder is absent (Req 1.4)", () => {
    const root = makeTempRoot(); // no source folder created
    const expectedPath = join(root, SOURCE_FOLDER);

    let caught: unknown;
    try {
      assertSourceFolderExists(root);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(MissingSourceFolderError);
    const err = caught as MissingSourceFolderError;
    // Identifies the missing folder by name and by resolved path.
    expect(err.sourcePath).toBe(expectedPath);
    expect(err.message).toContain(SOURCE_FOLDER);
    expect(err.message).toContain(expectedPath);
  });

  it("throws when the source path exists but is a file, not a directory (Req 1.4)", () => {
    const root = makeTempRoot();
    // Create a FILE named exactly like the source folder.
    writeFileSync(join(root, SOURCE_FOLDER), "not a directory");

    expect(() => assertSourceFolderExists(root)).toThrow(MissingSourceFolderError);
  });
});
