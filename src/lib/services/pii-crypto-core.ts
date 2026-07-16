/**
 * PII encryption CORE — pure AES-256-GCM envelope. No secrets, no I/O, no
 * `server-only` guard, so it is unit-testable in a plain Node context.
 *
 * Envelope format (JSON string): { v, iv, tag, ct }
 *   v   — key version (travels with the ciphertext so rotation is incremental)
 *   iv  — base64 random 96-bit nonce (unique per encryption)
 *   tag — base64 GCM authentication tag (tamper detection)
 *   ct  — base64 ciphertext
 *
 * AES-256-GCM is authenticated: a tampered ciphertext/tag/iv fails decryption
 * (throws) rather than silently returning garbage.
 */
import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit nonce, the GCM standard
const KEY_BYTES = 32; // AES-256

export interface PiiEnvelope {
  v: number;
  iv: string;
  tag: string;
  ct: string;
}

/** Encrypts `plaintext` under `key` (32 bytes) and returns an envelope string. */
export function encryptWithKey(
  key: Buffer,
  version: number,
  plaintext: string,
): string {
  if (key.length !== KEY_BYTES) {
    throw new Error(`PII key must be ${KEY_BYTES} bytes (got ${key.length})`);
  }
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const envelope: PiiEnvelope = {
    v: version,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ct: ct.toString("base64"),
  };
  return JSON.stringify(envelope);
}

/** Parses + validates an envelope string into a {@link PiiEnvelope}. */
export function parseEnvelope(envelope: string): PiiEnvelope {
  let env: unknown;
  try {
    env = JSON.parse(envelope);
  } catch {
    throw new Error("PII decrypt: malformed envelope");
  }
  const e = env as Partial<PiiEnvelope>;
  if (
    !e ||
    typeof e.v !== "number" ||
    typeof e.iv !== "string" ||
    typeof e.tag !== "string" ||
    typeof e.ct !== "string"
  ) {
    throw new Error("PII decrypt: incomplete envelope");
  }
  return e as PiiEnvelope;
}

/**
 * Decrypts an envelope. `resolveKey` returns the 32-byte key for the envelope's
 * version. Throws on tamper (GCM auth failure) or malformed input.
 */
export function decryptWithKey(
  resolveKey: (version: number) => Buffer,
  envelope: string,
): string {
  const env = parseEnvelope(envelope);
  const key = resolveKey(env.v);
  if (key.length !== KEY_BYTES) {
    throw new Error(`PII key must be ${KEY_BYTES} bytes (got ${key.length})`);
  }
  const decipher = crypto.createDecipheriv(
    ALGO,
    key,
    Buffer.from(env.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(env.tag, "base64"));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(env.ct, "base64")),
    decipher.final(), // throws if the auth tag does not verify
  ]);
  return pt.toString("utf8");
}
