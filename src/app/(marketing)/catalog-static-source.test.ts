/**
 * Unit test for the database-migration determination (task 13).
 *
 * Feature: image-catalog-rebuild - Requirement 23 (static source of truth).
 *
 * Requirement 23.1 / 23.2 record the determination that public product and
 * collection data is read ONLY from the static no-price data layer
 * (`src/lib/catalog.ts` → `src/data/*`), never from the Supabase database.
 * Because of that, the `017_update_product_catalog.sql` migration is skipped.
 *
 * This test enforces that determination as an executable invariant by scanning
 * the source text of every public (marketing) route module and asserting:
 *
 *   1. No marketing module performs a Supabase product/collection read - i.e.
 *      there is no `createClient(...)` and no `.from("products"|"collections"
 *      |"buckets")` table access anywhere under `src/app/(marketing)/**`.
 *   2. Every marketing page that sources product/collection data imports that
 *      data from `@/lib/catalog` or `@/data/*` (the static layer).
 *
 * The list of data-sourcing pages mirrors the evidence table in
 * `verification-notes.md` (task 13.1). If a future change wires a public page
 * to the database, or drops the static import, this test fails.
 *
 * Validates: Requirements 23.1, 23.2
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, sep } from "node:path";

const MARKETING_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Recursively collect every source module (`.ts` / `.tsx`) under the marketing
 * directory, excluding test files themselves.
 */
function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectSourceFiles(full));
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    if (/\.test\.(ts|tsx)$/.test(entry)) continue;
    out.push(full);
  }
  return out;
}

/** Normalise an absolute path to a marketing-relative POSIX label for messages. */
function label(absPath: string): string {
  return relative(MARKETING_DIR, absPath).split(sep).join("/");
}

const SOURCE_FILES = collectSourceFiles(MARKETING_DIR);

/** A Supabase table read against a public catalogue table, any quote style. */
const DB_TABLE_READ = /\.from\(\s*[`'"](?:products|collections|buckets)[`'"]\s*\)/;
/** Any Supabase client construction. */
const SUPABASE_CLIENT = /\bcreateClient\s*\(/;
/** Any import from the Supabase client layer. */
const SUPABASE_IMPORT = /from\s+["']@\/lib\/supabase/;

/**
 * Public pages that source product/collection data. Mirrors the evidence table
 * in verification-notes.md. Each MUST import from `@/lib/catalog` or `@/data/*`.
 */
const DATA_SOURCING_PAGES = [
  "page.tsx",
  "products/page.tsx",
  "products/[slug]/page.tsx",
  "collections/page.tsx",
  "collections/[slug]/page.tsx",
  "occasions/[slug]/page.tsx",
  "gift-builder/page.tsx",
  "blog/[slug]/page.tsx",
] as const;

/** Import from the static catalogue/data layer. */
const STATIC_SOURCE_IMPORT = /from\s+["']@\/(?:lib\/catalog|data\/[^"']+)["']/;

describe("Feature: image-catalog-rebuild - public catalogue is static, not DB-backed (Req 23.1, 23.2)", () => {
  it("discovers the marketing route modules to scan", () => {
    // Guard against a broken path/glob silently scanning nothing.
    expect(SOURCE_FILES.length).toBeGreaterThan(0);
  });

  describe("no public page reads products/collections from the database (Req 23.2)", () => {
    it.each(SOURCE_FILES)("%s performs no Supabase catalogue read", (file) => {
      const src = readFileSync(file, "utf8");
      const name = label(file);

      expect(DB_TABLE_READ.test(src), `${name} must not query a products/collections/buckets table`).toBe(false);
      expect(SUPABASE_CLIENT.test(src), `${name} must not create a Supabase client`).toBe(false);
      expect(SUPABASE_IMPORT.test(src), `${name} must not import a Supabase client`).toBe(false);
    });
  });

  describe("data-sourcing pages import from the static layer (Req 23.1)", () => {
    it.each(DATA_SOURCING_PAGES)("%s imports product/collection data from @/lib/catalog or @/data/*", (rel) => {
      const src = readFileSync(join(MARKETING_DIR, ...rel.split("/")), "utf8");
      expect(
        STATIC_SOURCE_IMPORT.test(src),
        `${rel} must source catalogue data from @/lib/catalog or @/data/*`,
      ).toBe(true);
    });
  });
});
