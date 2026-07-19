/**
 * P10a one-off: sweep the DEPRECATED old-convention variant keys.
 *
 * The perf phase generated extension-STRIPPED variant keys (`x__card.webp`). P10a replaced them
 * with extension-PRESERVING keys (`x.png__card.webp`) to end the same-basename collision. After the
 * new keys are verified live (prod serving them), the old orphaned keys are swept here.
 *
 * ORIGINALS ARE NEVER TOUCHED (deprecate-don't-destroy applies to originals). Only objects that are
 * a variant under the OLD convention (match `__<size>.webp` but NOT the new `.<ext>__<size>.webp`)
 * are removed, via the Storage API (removes both metadata + backing blob).
 *
 * Run: `npm run sweep-old-variants` (`-- --dry-run` to preview counts).
 */
import { createServiceClient, loadRequiredEnv, listAllObjects, BUCKET } from "./upload-images-v2";

const OLD = /__(?:thumb|card|detail)\.webp$/i;
const NEW = /\.(?:png|jpe?g|webp|avif)__(?:thumb|card|detail)\.webp$/i;
const BATCH = 100;

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const supabase = createServiceClient(loadRequiredEnv());

  const all = await listAllObjects(supabase);
  const oldOrphans = all.filter((k) => OLD.test(k) && !NEW.test(k));
  const newKeys = all.filter((k) => NEW.test(k));
  const originals = all.filter((k) => !OLD.test(k));

  console.log(`bucket total=${all.length} · originals=${originals.length} · new-keys=${newKeys.length} · OLD-orphans=${oldOrphans.length}`);

  if (dryRun) {
    console.log(`[dry-run] would remove ${oldOrphans.length} old-convention variant object(s). Originals untouched.`);
    return;
  }

  let removed = 0;
  const errors: string[] = [];
  for (let i = 0; i < oldOrphans.length; i += BATCH) {
    const batch = oldOrphans.slice(i, i + BATCH);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) { errors.push(error.message); console.log(`[sweep] batch failed: ${error.message} (continuing)`); continue; }
    removed += batch.length;
    console.log(`[sweep] removed ${removed}/${oldOrphans.length}`);
  }
  console.log(`\nDone. removed=${removed}, errors=${errors.length}. Originals (${originals.length}) + new-keys (${newKeys.length}) untouched.`);
  if (errors.length > 0) process.exitCode = 1;
}

main().catch((err: unknown) => { console.error(err instanceof Error ? err.message : String(err)); process.exitCode = 1; });
