/**
 * Server-side image content validation (Prompt 7c-rest item 1). Pure, no IO.
 *
 * SECURITY: validates by MAGIC BYTES (file content), NOT the client-supplied extension or
 * Content-Type. A renamed non-image (evil.exe → photo.jpg) fails here because its bytes are not a
 * valid JPEG/PNG/WebP signature. This is the first line of the accept-with-mitigations posture for
 * the proof-photo persist path (the async malware scanner is the elevated P10 obligation).
 */
export type ProofImageMime = "image/jpeg" | "image/png" | "image/webp";

export const PROOF_MAX_BYTES = 10 * 1024 * 1024; // 10 MB per photo
export const PROOF_MAX_PER_ORDER = 10; // count cap per order
export const PROOF_EXT: Record<ProofImageMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Detect a supported image type from the leading bytes; null if not a valid image. */
export function sniffImageMime(bytes: ArrayBuffer): ProofImageMime | null {
  const b = new Uint8Array(bytes);
  // JPEG: FF D8 FF
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) return "image/png";
  // WebP: "RIFF" .... "WEBP"
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return "image/webp";
  return null;
}

export type ProofValidation =
  | { ok: true; mime: ProofImageMime }
  | { ok: false; code: "empty" | "too_large" | "not_an_image" };

/** Validate proof-photo bytes by content + size. NEVER echoes file content (by-reference only). */
export function validateProofImage(bytes: ArrayBuffer): ProofValidation {
  if (bytes.byteLength === 0) return { ok: false, code: "empty" };
  if (bytes.byteLength > PROOF_MAX_BYTES) return { ok: false, code: "too_large" };
  const mime = sniffImageMime(bytes);
  if (!mime) return { ok: false, code: "not_an_image" };
  return { ok: true, mime };
}
