/**
 * Integration tests for the upload script (`scripts/upload-images-v2.ts`).
 *
 * Feature: image-catalog-rebuild — Task 8.4.
 *
 * These exercise the clear + upload transport phases end-to-end against a
 * hand-rolled fake Supabase Storage client (no network, no real bucket) and a
 * couple of throwaway temp directories (no writes into the repo tree). They
 * cover:
 *   - recursive listing across nested folders (Req 7.1)
 *   - deleting objects in batches of 100, with pagination (Req 7.2)
 *   - continue-on-error when a delete batch fails (Req 7.4)
 *   - uploading in batches of 10 with a 200 ms delay between batches (Req 8.3)
 *   - `upsert: true` + extension-mapped `contentType` on every upload (Req 8.4)
 *   - `uploaded/total` progress logging (Req 8.5)
 *   - continue-on-failure when an upload fails (Req 8.6)
 *   - writing all failures to `upload-errors.json` (Req 8.7)
 *   - `--dry-run` performing no delete or upload (Req 7.3, 8.8)
 *
 * The fake records every `list`/`remove`/`upload` call so behaviour can be
 * asserted precisely; `sleep` and `log` are injected so tests run instantly and
 * observe progress output.
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  clearBucket,
  contentTypeFor,
  deriveObjectKey,
  listAllObjects,
  uploadTree,
  walkLocalFiles,
  writeUploadErrors,
  CLEAR_BATCH,
  UPLOAD_BATCH,
  BATCH_DELAY_MS,
  type Sleep,
  type UploadError,
} from "./upload-images-v2";

// --- Fake Supabase Storage client -----------------------------------------

interface ListOptions {
  limit: number;
  offset: number;
  sortBy: { column: string; order: string };
}

interface ListEntry {
  name: string;
  id: string | null;
}

interface ListResponse {
  data: ListEntry[] | null;
  error: { message: string } | null;
}

interface RemoveResponse {
  error: { message: string } | null;
}

interface UploadOptions {
  upsert?: boolean;
  contentType?: string;
}

interface UploadResponse {
  error: { message: string } | null;
}

/** Returns an error message to fail the Nth remove batch, or `null` to succeed. */
type RemoveFail = (batch: string[], callIndex: number) => string | null;
/** Returns an error message to fail an upload of `key`, or `null` to succeed. */
type UploadFail = (key: string) => string | null;

/**
 * A minimal in-memory stand-in for `supabase.storage.from(bucket)`. It models
 * the bucket as a flat set of object keys and derives folder/file `list`
 * entries the same way the real Storage API does (folder entries have a `null`
 * id), including `limit`/`offset` pagination and name-ascending ordering.
 */
class FakeBucket {
  private readonly keys: Set<string>;
  readonly listCalls: { prefix: string; offset: number }[] = [];
  readonly removeBatches: string[][] = [];
  readonly uploadCalls: { key: string; options: UploadOptions }[] = [];
  private removeCallIndex = 0;

  constructor(
    initialKeys: string[],
    private readonly removeFail: RemoveFail = () => null,
    private readonly uploadFail: UploadFail = () => null,
  ) {
    this.keys = new Set(initialKeys);
  }

  get remaining(): string[] {
    return [...this.keys];
  }

  list(prefix: string, options: ListOptions): Promise<ListResponse> {
    this.listCalls.push({ prefix, offset: options.offset });

    const norm = prefix === "" ? "" : `${prefix}/`;
    const isFolder = new Map<string, boolean>();
    for (const key of this.keys) {
      if (prefix !== "" && !key.startsWith(norm)) continue;
      const rest = prefix === "" ? key : key.slice(norm.length);
      if (rest === "") continue;
      const slash = rest.indexOf("/");
      if (slash === -1) {
        if (!isFolder.has(rest)) isFolder.set(rest, false);
      } else {
        isFolder.set(rest.slice(0, slash), true);
      }
    }

    const entries: ListEntry[] = [...isFolder.entries()]
      .map(([name, folder]) => ({ name, id: folder ? null : `id-${name}` }))
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    const page = entries.slice(options.offset, options.offset + options.limit);
    return Promise.resolve({ data: page, error: null });
  }

  remove(batch: string[]): Promise<RemoveResponse> {
    const idx = this.removeCallIndex++;
    this.removeBatches.push([...batch]);
    const message = this.removeFail(batch, idx);
    if (message) return Promise.resolve({ error: { message } });
    for (const key of batch) this.keys.delete(key);
    return Promise.resolve({ error: null });
  }

  upload(
    key: string,
    _body: Uint8Array,
    options: UploadOptions,
  ): Promise<UploadResponse> {
    this.uploadCalls.push({ key, options });
    const message = this.uploadFail(key);
    if (message) return Promise.resolve({ error: { message } });
    this.keys.add(key);
    return Promise.resolve({ error: null });
  }
}

class FakeSupabase {
  readonly fromCalls: string[] = [];
  constructor(private readonly bucket: FakeBucket) {}
  readonly storage = {
    from: (name: string): FakeBucket => {
      this.fromCalls.push(name);
      return this.bucket;
    },
  };
}

/** Build a fake client and expose its bucket for assertions. */
function makeClient(
  keys: string[],
  removeFail?: RemoveFail,
  uploadFail?: UploadFail,
): { client: SupabaseClient; bucket: FakeBucket } {
  const bucket = new FakeBucket(keys, removeFail, uploadFail);
  const fake = new FakeSupabase(bucket);
  return { client: fake as unknown as SupabaseClient, bucket };
}

/** Generate `count` flat object keys `img-000.webp` … padded and ordered. */
function flatKeys(count: number): string[] {
  return Array.from(
    { length: count },
    (_unused, i) => `img-${String(i).padStart(4, "0")}.webp`,
  );
}

// --- Temp-dir plumbing (no writes into the repo tree) -----------------------

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "upload-images-v2-it-"));
  tmpDirs.push(dir);
  return dir;
}

/** Create a temp tree from a list of relative file paths, return the root. */
function makeTmpTree(relPaths: string[]): string {
  const root = makeTmpDir();
  for (const rel of relPaths) {
    const full = join(root, rel);
    const dir = full.slice(0, Math.max(full.lastIndexOf("/"), full.lastIndexOf("\\")));
    mkdirSync(dir, { recursive: true });
    writeFileSync(full, `bytes:${rel}`);
  }
  return root;
}

afterEach(() => {
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true });
  tmpDirs.length = 0;
});

// --- Pure helpers -----------------------------------------------------------

describe("deriveObjectKey — relative POSIX object key", () => {
  it("normalises backslashes and forward slashes to a relative POSIX key", () => {
    expect(deriveObjectKey("product-images", "product-images/client/mug/a.webp")).toBe(
      "client/mug/a.webp",
    );
    expect(
      deriveObjectKey("product-images", "product-images\\client\\mug\\a.webp"),
    ).toBe("client/mug/a.webp");
  });
});

describe("contentTypeFor — extension-mapped content type", () => {
  it("maps supported extensions (case-insensitively) and falls back for others", () => {
    expect(contentTypeFor("a.webp")).toBe("image/webp");
    expect(contentTypeFor("a.JPG")).toBe("image/jpeg");
    expect(contentTypeFor("a.jpeg")).toBe("image/jpeg");
    expect(contentTypeFor("a.avif")).toBe("image/avif");
    expect(contentTypeFor("a.PNG")).toBe("image/png");
    expect(contentTypeFor("a.txt")).toBe("application/octet-stream");
  });
});

describe("walkLocalFiles — deterministic recursive file walk", () => {
  it("returns every file beneath the root in stable name order", () => {
    const root = makeTmpTree([
      "onboarding/bottle/b.png",
      "onboarding/bottle/a.png",
      "client/mug/set-1/z.webp",
      "root.jpg",
    ]);

    const files = walkLocalFiles(root);
    const keys = files.map((f) => deriveObjectKey(root, f));

    expect(keys).toEqual([
      "client/mug/set-1/z.webp",
      "onboarding/bottle/a.png",
      "onboarding/bottle/b.png",
      "root.jpg",
    ]);
  });
});

// --- listAllObjects: recursive listing (Req 7.1) ----------------------------

describe("listAllObjects — recursive listing (Req 7.1)", () => {
  it("enumerates every object across nested folders", async () => {
    const keys = [
      "client/mug/set-1/a.webp",
      "client/mug/set-1/b.webp",
      "client/mug/set-2/c.webp",
      "onboarding/bottle/d.png",
      "root-file.jpg",
    ];
    const { client, bucket } = makeClient(keys);

    const listed = await listAllObjects(client);

    expect(new Set(listed)).toEqual(new Set(keys));
    // It recursed into folders rather than only listing the root prefix.
    expect(bucket.listCalls.some((c) => c.prefix === "client/mug/set-1")).toBe(true);
  });

  it("pages through a prefix with more than one page of objects", async () => {
    const keys = flatKeys(250);
    const { client, bucket } = makeClient(keys);

    const listed = await listAllObjects(client);

    expect(listed).toHaveLength(250);
    // Root prefix paged at offsets 0, 100, 200.
    const rootOffsets = bucket.listCalls
      .filter((c) => c.prefix === "")
      .map((c) => c.offset);
    expect(rootOffsets).toEqual([0, 100, 200]);
  });
});

// --- clearBucket: batches of 100 + continue-on-error (Req 7.2, 7.4) ---------

describe("clearBucket — delete batches of 100 (Req 7.2)", () => {
  it("deletes all objects in batches of CLEAR_BATCH", async () => {
    const keys = flatKeys(250);
    const { client, bucket } = makeClient(keys);
    const logs: string[] = [];

    const result = await clearBucket(client, false, (m) => logs.push(m));

    expect(CLEAR_BATCH).toBe(100);
    expect(result.listed).toBe(250);
    expect(result.deleted).toBe(250);
    expect(result.errors).toHaveLength(0);
    expect(bucket.removeBatches.map((b) => b.length)).toEqual([100, 100, 50]);
    expect(bucket.remaining).toHaveLength(0);
    // Progress is logged as deleted/total.
    expect(logs.some((l) => /\[clear\] deleted \d+\/250/.test(l))).toBe(true);
  });
});

describe("clearBucket — continue-on-error (Req 7.4)", () => {
  it("records a failing delete batch and keeps clearing the rest", async () => {
    const keys = flatKeys(250);
    // Fail the 2nd batch (index 1) only.
    const { client, bucket } = makeClient(keys, (_batch, idx) =>
      idx === 1 ? "boom: rate limited" : null,
    );
    const logs: string[] = [];

    const result = await clearBucket(client, false, (m) => logs.push(m));

    expect(bucket.removeBatches.map((b) => b.length)).toEqual([100, 100, 50]);
    // First + third batches deleted, second failed.
    expect(result.deleted).toBe(150);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toContain("boom: rate limited");
    expect(result.errors[0]?.keys).toHaveLength(100);
    expect(logs.some((l) => l.includes("failed") && l.includes("continuing"))).toBe(
      true,
    );
  });
});

describe("clearBucket — dry-run no-op (Req 7.3, 8.8)", () => {
  it("deletes nothing and logs the would-delete count", async () => {
    const keys = flatKeys(42);
    const { client, bucket } = makeClient(keys);
    const logs: string[] = [];

    const result = await clearBucket(client, true, (m) => logs.push(m));

    expect(result.listed).toBe(42);
    expect(result.deleted).toBe(0);
    expect(bucket.removeBatches).toHaveLength(0);
    expect(bucket.remaining).toHaveLength(42);
    expect(logs.some((l) => /\[dry-run\] would delete 42 object/.test(l))).toBe(true);
  });
});

// --- uploadTree: batching, delay, upsert+contentType, progress --------------

describe("uploadTree — batches of 10 with a delay (Req 8.3)", () => {
  it("uploads in batches of UPLOAD_BATCH with BATCH_DELAY_MS between batches", async () => {
    const relPaths = Array.from(
      { length: 25 },
      (_u, i) => `c/file-${String(i).padStart(2, "0")}.webp`,
    );
    const root = makeTmpTree(relPaths);
    const { client, bucket } = makeClient([]);

    const sleepArgs: number[] = [];
    const uploadsAtSleep: number[] = [];
    const sleep: Sleep = (ms) => {
      sleepArgs.push(ms);
      uploadsAtSleep.push(bucket.uploadCalls.length);
      return Promise.resolve();
    };

    const result = await uploadTree(client, root, false, () => {}, sleep);

    expect(UPLOAD_BATCH).toBe(10);
    expect(result.total).toBe(25);
    expect(result.uploaded).toBe(25);
    // 3 batches (10, 10, 5) => a delay after the first two batches only.
    expect(sleepArgs).toEqual([BATCH_DELAY_MS, BATCH_DELAY_MS]);
    // The delay fires exactly at the 10-object batch boundaries.
    expect(uploadsAtSleep).toEqual([10, 20]);
  });
});

describe("uploadTree — upsert + contentType (Req 8.4)", () => {
  it("sets upsert:true and an extension-mapped contentType on every upload", async () => {
    const relPaths = [
      "photo.webp",
      "pic.JPG",
      "shot.jpeg",
      "vector.avif",
      "raster.PNG",
      "notes.txt",
    ];
    const root = makeTmpTree(relPaths);
    const { client, bucket } = makeClient([]);

    await uploadTree(client, root, false, () => {}, () => Promise.resolve());

    const byKey = new Map(
      bucket.uploadCalls.map((c) => [c.key, c.options] as const),
    );
    expect(byKey.get("photo.webp")?.contentType).toBe("image/webp");
    expect(byKey.get("pic.JPG")?.contentType).toBe("image/jpeg");
    expect(byKey.get("shot.jpeg")?.contentType).toBe("image/jpeg");
    expect(byKey.get("vector.avif")?.contentType).toBe("image/avif");
    expect(byKey.get("raster.PNG")?.contentType).toBe("image/png");
    expect(byKey.get("notes.txt")?.contentType).toBe("application/octet-stream");
    // Every upload is an upsert.
    expect(bucket.uploadCalls.every((c) => c.options.upsert === true)).toBe(true);
  });
});

describe("uploadTree — progress logging (Req 8.5)", () => {
  it("logs uploaded/total progress", async () => {
    const root = makeTmpTree(["a.webp", "b.webp", "c.webp"]);
    const { client } = makeClient([]);
    const logs: string[] = [];

    await uploadTree(client, root, false, (m) => logs.push(m), () =>
      Promise.resolve(),
    );

    expect(logs.some((l) => /\[upload\] uploaded \d+\/3/.test(l))).toBe(true);
  });
});

describe("uploadTree — continue-on-failure (Req 8.6)", () => {
  it("records a failing upload and keeps uploading the rest", async () => {
    const root = makeTmpTree(["a.webp", "bad.webp", "c.webp"]);
    const { client, bucket } = makeClient([], undefined, (key) =>
      key === "bad.webp" ? "upload rejected" : null,
    );

    const result = await uploadTree(client, root, false, () => {}, () =>
      Promise.resolve(),
    );

    expect(result.total).toBe(3);
    expect(result.uploaded).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({ path: "bad.webp", message: "upload rejected" });
    // All three were attempted.
    expect(bucket.uploadCalls.map((c) => c.key).sort()).toEqual([
      "a.webp",
      "bad.webp",
      "c.webp",
    ]);
  });
});

describe("uploadTree — object keys are relative POSIX paths (Req 8.2)", () => {
  it("preserves the relative folder path as the object key", async () => {
    const root = makeTmpTree([
      "onboarding/bottle/a.webp",
      "client/mug/set-1/b.webp",
    ]);
    const { client, bucket } = makeClient([]);

    await uploadTree(client, root, false, () => {}, () => Promise.resolve());

    expect(bucket.uploadCalls.map((c) => c.key).sort()).toEqual([
      "client/mug/set-1/b.webp",
      "onboarding/bottle/a.webp",
    ]);
  });
});

describe("uploadTree — dry-run no-op (Req 8.8)", () => {
  it("uploads nothing and logs the would-upload count", async () => {
    const root = makeTmpTree(["a.webp", "b.webp", "c.webp", "d.webp"]);
    const { client, bucket } = makeClient([]);
    const logs: string[] = [];

    const result = await uploadTree(client, root, true, (m) => logs.push(m), () =>
      Promise.resolve(),
    );

    expect(result.total).toBe(4);
    expect(result.uploaded).toBe(0);
    expect(bucket.uploadCalls).toHaveLength(0);
    expect(logs.some((l) => /\[dry-run\] would upload 4 object/.test(l))).toBe(true);
  });
});

// --- writeUploadErrors: error log (Req 8.7) ---------------------------------

describe("writeUploadErrors — write failures to upload-errors.json (Req 8.7)", () => {
  it("writes the recorded failures as pretty-printed JSON", () => {
    const dir = makeTmpDir();
    const path = join(dir, "upload-errors.json");
    const errors: UploadError[] = [
      { path: "client/mug/a.webp", message: "boom" },
      { path: "onboarding/bottle/b.png", message: "timeout" },
    ];

    writeUploadErrors(errors, path);

    const written = readFileSync(path, "utf8");
    expect(JSON.parse(written)).toEqual(errors);
    expect(written.endsWith("\n")).toBe(true);
  });

  it("always writes a file — an empty array signals a clean run", () => {
    const dir = makeTmpDir();
    const path = join(dir, "upload-errors.json");

    writeUploadErrors([], path);

    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual([]);
  });
});
