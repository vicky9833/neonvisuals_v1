/**
 * Prompt 4a item 2 — KEY RECOVERY, process A (WRITER).
 * Loads the key from Vault, encrypts a synthetic value, and writes ONLY the
 * envelope + a sha256 of the plaintext to disk. The plaintext and the key are
 * never persisted. A separate fresh process (reader) must recover it.
 * Run: npx tsx verify4a/_key_recovery_write.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { encryptWithKey } from "../src/lib/services/pii-crypto-core";

function env() {
  return Object.fromEntries(
    readFileSync("c:/neonvisuals_v1/.env.local", "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  ) as Record<string, string>;
}

async function main() {
  const e = env();
  const admin = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.rpc("get_pii_dek", { p_version: 1 });
  if (error) throw new Error("key load failed: " + error.message);
  const key = Buffer.from(data as string, "base64");

  const runid = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const synthetic = `t4a_${runid}_recovery_synthetic • πύλη • 😀 • 9876543210`;
  const envelope = encryptWithKey(key, 1, synthetic);
  const sha = createHash("sha256").update(synthetic, "utf8").digest("hex");

  writeFileSync(
    "c:/neonvisuals_v1/verify4a/_recovery_ct.json",
    JSON.stringify({ envelope, expected_sha256: sha, wrote_at: new Date().toISOString() }, null, 2),
  );
  console.log("WRITER (process A): pid", process.pid);
  console.log("  key loaded from Vault, length", key.length, "(value NOT printed)");
  console.log("  wrote envelope to verify4a/_recovery_ct.json");
  console.log("  plaintext sha256:", sha, "(plaintext itself NOT persisted)");
  // Key drops out of memory on process exit.
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});
