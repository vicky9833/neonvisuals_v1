import "server-only";

/**
 * Upload malware-scan SEAM (Prompt 4b item 3; CLOSED fail-closed in P10a).
 *
 * RULING (P10a): synchronous, env-configured scan-API call, FAIL-CLOSED, with
 * provider activation gated to go-live. Every file-landing upload path
 * (concierge attachments, order proof-photos, employee CSV/XLSX import) calls
 * this before persisting/parsing. The upload is REJECTED when ANY of:
 *   - no scanner is configured (`MALWARE_SCAN_URL` unset)  → `scanner_not_configured`
 *   - the scanner is unreachable / errors / times out       → `scanner_unreachable`
 *   - the scanner returns a non-clean verdict                → `malicious`
 *
 * NEVER fail-open. With no scanner configured (the shipped default until a
 * provider + key are wired at go-live) EVERY upload path rejects — this is the
 * intended shipped behavior, surfaced to the operator, not a silent skip.
 *
 * Provider-agnostic contract: POST the raw bytes to `MALWARE_SCAN_URL`
 * (optional `MALWARE_SCAN_API_KEY` bearer). A clean file is signalled by a JSON
 * body `{ "clean": true }` (or `{ "status": "clean" }`). Anything else — a
 * `clean:false`, an `infected`/`malicious` status, a non-2xx, malformed JSON,
 * or a network/timeout error — rejects the upload. Wiring a concrete provider
 * adapter is the go-live gate item; the seam itself is scanner-ready here.
 */

/** Milliseconds before an unresponsive scanner is treated as unreachable (reject). */
const SCAN_TIMEOUT_MS = 10_000;

/** Thrown to REJECT an upload. Carries an HTTP status the route maps directly. */
export class UploadScanError extends Error {
  readonly code: "scanner_not_configured" | "scanner_unreachable" | "malicious";
  readonly status: number;
  constructor(
    code: UploadScanError["code"],
    message: string,
  ) {
    super(message);
    this.name = "UploadScanError";
    this.code = code;
    // 503 for "we couldn't scan" (config/reachability); 422 for a positive malicious verdict.
    this.status = code === "malicious" ? 422 : 503;
  }
}

/** Interpret a scanner response body as a clean verdict. Unknown shape = NOT clean. */
function isCleanVerdict(body: unknown): boolean {
  if (body === null || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (b.clean === true) return true;
  if (typeof b.status === "string" && b.status.toLowerCase() === "clean") return true;
  return false;
}

/**
 * Scan an upload; RESOLVE only for a clean verdict, otherwise THROW
 * {@link UploadScanError} (fail-closed). `filename` is passed to the scanner as
 * a hint header only — it never influences the accept/reject decision, which is
 * content-based on the scanner side.
 */
export async function scanUploadOrThrow(bytes: ArrayBuffer, filename: string): Promise<void> {
  const url = process.env.MALWARE_SCAN_URL;

  // FAIL-CLOSED: no scanner configured → reject (shipped default until go-live).
  if (!url) {
    throw new UploadScanError(
      "scanner_not_configured",
      "Uploads are temporarily unavailable (file scanning is not yet enabled). Please try again later.",
    );
  }

  const apiKey = process.env.MALWARE_SCAN_API_KEY;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Filename": encodeURIComponent(filename),
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: Buffer.from(bytes),
      signal: AbortSignal.timeout(SCAN_TIMEOUT_MS),
    });
  } catch {
    // Network error / timeout / abort → cannot prove clean → reject.
    throw new UploadScanError(
      "scanner_unreachable",
      "Uploads are temporarily unavailable (file scanning could not be completed). Please try again later.",
    );
  }

  if (!response.ok) {
    throw new UploadScanError(
      "scanner_unreachable",
      "Uploads are temporarily unavailable (file scanning could not be completed). Please try again later.",
    );
  }

  let verdict: unknown;
  try {
    verdict = await response.json();
  } catch {
    // A 2xx with an unparseable body cannot be trusted as clean → reject.
    throw new UploadScanError(
      "scanner_unreachable",
      "Uploads are temporarily unavailable (file scanning could not be completed). Please try again later.",
    );
  }

  if (!isCleanVerdict(verdict)) {
    throw new UploadScanError(
      "malicious",
      "This file was rejected by our security scan and was not uploaded.",
    );
  }
  // Clean — allow the caller to proceed with persist/parse.
}
