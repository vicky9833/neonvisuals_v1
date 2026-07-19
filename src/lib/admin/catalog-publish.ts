import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { regenerateFromDb } from "../../../scripts/regenerate-catalog-from-db";

/**
 * P11b — catalog publish pipeline (ruling B: NO repo-push, NO build-time DB fetch).
 *
 * The public catalog is a committed static file (src/data/products.ts). "Publishing" here:
 *   1. regenerates the static sources from the DB (payload-sourced, byte-faithful — P11a),
 *   2. writes that output to a RETRIEVABLE location (system_settings `catalog_pending_publish`),
 *   3. advances the last-published baseline so the "N pending changes" indicator resets.
 * It does NOT commit, push, or deploy. A human performs the final commit+deploy (optionally a Vercel
 * Deploy Hook is pinged as a BUILD-TRIGGER only — never a repo write). This keeps the app free of any
 * repo-write / arbitrary-deploy capability (ruling B) while the live site only ever changes via the
 * human-controlled deploy step.
 */

const PUBLISH_STATE_ID = "catalog_publish_state";
const PENDING_PUBLISH_ID = "catalog_pending_publish";

export interface PublishState {
  seeded: boolean;
  published_hashes: Record<string, string>;
  published_at: string | null;
  published_count: number;
}

export interface PendingChanges {
  added: string[];
  removed: string[];
  changed: string[];
  count: number;
}

export interface PublishResult {
  productCount: number;
  pendingBefore: number;
  outputHash: string;
  generatedAt: string;
  deployHookPinged: boolean;
}

const sha256 = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");

/**
 * Per-SKU hash of the current ACTIVE catalog payloads (the set that would be published). Stable:
 * the same stored jsonb payload yields the same serialization → same hash, so an unedited catalog
 * produces the same map every time.
 */
async function computeCurrentHashes(admin: SupabaseClient): Promise<Record<string, string>> {
  const { data, error } = await admin
    .from("products")
    .select("sku, public_payload")
    .eq("status", "active")
    .not("public_payload", "is", null);
  if (error) throw new Error(`hash scan failed: ${error.message}`);
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.sku as string] = sha256(JSON.stringify(row.public_payload));
  }
  return map;
}

/**
 * Read the publish-state singleton, lazily SEEDING it on first use so the baseline == the currently
 * live catalog (pending starts at 0 — the committed static file was generated from these payloads).
 */
export async function getPublishState(admin: SupabaseClient): Promise<PublishState> {
  const { data, error } = await admin
    .from("system_settings")
    .select("settings")
    .eq("id", PUBLISH_STATE_ID)
    .maybeSingle();
  if (error) throw new Error(`publish-state read failed: ${error.message}`);
  const state = (data?.settings ?? null) as PublishState | null;

  if (state && state.seeded) return state;

  // Seed (or re-seed a placeholder row) from the current active catalog.
  const hashes = await computeCurrentHashes(admin);
  const seeded: PublishState = {
    seeded: true,
    published_hashes: hashes,
    published_at: new Date().toISOString(),
    published_count: Object.keys(hashes).length,
  };
  const { error: upErr } = await admin
    .from("system_settings")
    .upsert({ id: PUBLISH_STATE_ID, settings: seeded }, { onConflict: "id" });
  if (upErr) throw new Error(`publish-state seed failed: ${upErr.message}`);
  return seeded;
}

/** Diff the current active catalog against the last-published baseline → added/removed/changed. */
export async function getPendingChanges(admin: SupabaseClient): Promise<PendingChanges> {
  const [state, current] = await Promise.all([getPublishState(admin), computeCurrentHashes(admin)]);
  const base = state.published_hashes ?? {};
  const added: string[] = [];
  const changed: string[] = [];
  for (const sku of Object.keys(current)) {
    if (!(sku in base)) added.push(sku);
    else if (base[sku] !== current[sku]) changed.push(sku);
  }
  const removed = Object.keys(base).filter((sku) => !(sku in current));
  return { added, removed, changed, count: added.length + removed.length + changed.length };
}

/**
 * Publish the catalog (ruling B). Regenerate → store output in system_settings → advance baseline.
 * Never commits/pushes. Optionally pings a configured Vercel Deploy Hook (build-trigger only).
 */
export async function publishCatalog(admin: SupabaseClient): Promise<PublishResult> {
  const pendingBefore = (await getPendingChanges(admin)).count;

  // Regenerate (payload-sourced, byte-faithful). If any active product violates the catalog
  // invariant (e.g. missing image), the serializer throws — surface it as a clean publish failure
  // rather than a raw stack trace. The activation guard normally prevents this state.
  let regen: Awaited<ReturnType<typeof regenerateFromDb>>;
  try {
    regen = await regenerateFromDb(admin);
  } catch (e) {
    throw new Error(`Publish blocked: catalog regeneration failed — ${e instanceof Error ? e.message : String(e)}`);
  }
  const outputHash = sha256(regen.productsSource + regen.productImagesSource);
  const generatedAt = new Date().toISOString();

  // 1) Write the regenerated output to the retrievable location (NOT the filesystem, NOT the repo).
  const { error: pendErr } = await admin.from("system_settings").upsert(
    {
      id: PENDING_PUBLISH_ID,
      settings: {
        products_ts: regen.productsSource,
        product_images_ts: regen.productImagesSource,
        product_count: regen.productCount,
        output_hash: outputHash,
        generated_at: generatedAt,
        note: "Regenerated static catalog awaiting a manual commit+deploy. NOT auto-deployed.",
      },
    },
    { onConflict: "id" },
  );
  if (pendErr) throw new Error(`pending-publish write failed: ${pendErr.message}`);

  // 2) Advance the last-published baseline (resets the pending-changes indicator to 0).
  const hashes = await computeCurrentHashes(admin);
  const state: PublishState = {
    seeded: true,
    published_hashes: hashes,
    published_at: generatedAt,
    published_count: Object.keys(hashes).length,
  };
  const { error: stateErr } = await admin
    .from("system_settings")
    .upsert({ id: PUBLISH_STATE_ID, settings: state }, { onConflict: "id" });
  if (stateErr) throw new Error(`publish-state advance failed: ${stateErr.message}`);

  // 3) Optional build-trigger only (never a repo write). Absent by default.
  let deployHookPinged = false;
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (hook && /^https:\/\//.test(hook)) {
    try {
      await fetch(hook, { method: "POST" });
      deployHookPinged = true;
    } catch {
      deployHookPinged = false; // non-fatal: publish output is already persisted
    }
  }

  return { productCount: regen.productCount, pendingBefore, outputHash, generatedAt, deployHookPinged };
}

/** Convenience wrapper using the service-role client. */
export async function getCatalogPendingChanges(): Promise<PendingChanges> {
  return getPendingChanges(createAdminClient());
}
