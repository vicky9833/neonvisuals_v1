import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  encryptWithKey,
  decryptWithKey,
  parseEnvelope,
} from "@/lib/services/pii-crypto-core";

/**
 * Server-only PII encryption facade (Prompt 4a). App-layer AES-256-GCM envelope
 * encryption for `phone` and `delivery_address`. The data-encryption key lives
 * in Supabase Vault and is fetched via the service-role-only RPC `get_pii_dek`
 * — the key is NEVER committed, NEVER logged, and NEVER shipped to the client.
 *
 * `import "server-only"` guarantees this module (and the service-role client it
 * pulls in) can never be bundled into client code.
 */

const CURRENT_KEY_VERSION = 1;

/** In-memory key cache keyed by version. Cleared on process restart. */
const keyCache = new Map<number, Buffer>();

async function fetchKey(version: number): Promise<Buffer> {
  const cached = keyCache.get(version);
  if (cached) return cached;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_pii_dek", { p_version: version });
  if (error) {
    throw new Error(`PII key load failed (v${version}): ${error.message}`);
  }
  if (!data || typeof data !== "string") {
    throw new Error(`PII key v${version} not found in Vault`);
  }
  const key = Buffer.from(data, "base64");
  if (key.length !== 32) {
    throw new Error(`PII key v${version} is not 32 bytes`);
  }
  keyCache.set(version, key);
  return key;
}

/** Encrypts a plaintext PII value under the current key version. */
export async function encryptPII(plaintext: string): Promise<string> {
  const key = await fetchKey(CURRENT_KEY_VERSION);
  return encryptWithKey(key, CURRENT_KEY_VERSION, plaintext);
}

/** Decrypts an envelope, loading whatever key version it references. */
export async function decryptPII(envelope: string): Promise<string> {
  const { v } = parseEnvelope(envelope);
  const key = await fetchKey(v);
  return decryptWithKey(() => key, envelope);
}

/** Encrypts nullable/optional PII: null | undefined | "" → null (nothing stored). */
export async function encryptPIINullable(
  value: string | null | undefined,
): Promise<string | null> {
  if (value === null || value === undefined || value.trim() === "") return null;
  return encryptPII(value);
}

/** Decrypts a nullable envelope: null | undefined → null. */
export async function decryptPIINullable(
  envelope: string | null | undefined,
): Promise<string | null> {
  if (!envelope) return null;
  return decryptPII(envelope);
}
