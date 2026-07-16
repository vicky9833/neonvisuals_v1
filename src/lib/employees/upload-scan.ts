import "server-only";

/**
 * Upload malware-scan SEAM (Prompt 4b item 3).
 *
 * ⚠️ DECISION PENDING (surfaced to the operator, NOT silently skipped): there is
 * NO malware scanner available on this stack today (Vercel serverless functions
 * + Supabase — neither ships an AV engine, and files are stream-parsed in memory,
 * never persisted). This function is the single seam where a scan integration
 * (e.g. a ClamAV service, an S3+Lambda AV pipeline, or a third-party scan API)
 * MUST be wired before uploads are considered scanned.
 *
 * Current mitigations in lieu of a scanner (documented, not a substitute):
 *   - hard byte-size cap + row cap (bounds zip-bomb / oversized payloads),
 *   - CSV parsed as text; XLSX parsed with no formula evaluation,
 *   - files are never persisted to disk/storage (in-memory parse only),
 *   - upload gated to authenticated owner/admin/hr on a Pro plan.
 *
 * This returns without scanning by design; the operator decides stub-vs-defer-vs
 * -integrate. It throws only if a real scanner is later wired and detects a threat.
 */
export async function scanUploadOrThrow(_bytes: ArrayBuffer, _filename: string): Promise<void> {
  // TODO(scan): integrate a malware scanner here. Until then, see the mitigations
  // above. Do NOT remove this seam — uploads must pass through it.
  //
  // ⚠️ HARD ASSERTION (Prompt 4b promote confirmation): the no-op is ONLY tolerable
  // while uploads are parsed in-memory and NEVER persisted or forwarded. If a future
  // change persists the raw file (Storage/disk) OR forwards it to another service,
  // a REAL malware scan becomes REQUIRED here BEFORE that change ships — the no-op
  // must NOT silently read as "handled".
  //
  // TRACKED OBLIGATION: Prompt 10 (security sweep) owns closing this gap
  // (integrate a scan API / AV pipeline, or an explicit accepted-risk sign-off).
  return;
}
