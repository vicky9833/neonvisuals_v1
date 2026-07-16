/**
 * Prompt 4a item 2 — KEY RECOVERY, process B (READER, FRESH process).
 * Holds NOTHING from process A. Reads the envelope from disk, loads the key
 * from Vault fresh, decrypts, and proves the recovered plaintext matches the
 * writer's sha256 byte-for-byte. This proves "a new deploy can read old
 * ciphertext" = the data is recoverable.
 * Run: npx tsx verify4a/_key_recovery_read.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { decryptWithKey } from "../src/lib/services/pii-crypto-core";

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
  const { envelope, expected_sha256 } = JSON.parse(
    readFileSync("c:/neonvisuals_v1/verify4a/_recovery_ct.json", "utf8"),
  ) as { envelope: string; expected_sha256: string };

  const { data, error } = await admin.rpc("get_pii_dek", { p_version: 1 });
  if (error) throw new Error("key load failed: " + error.message);
  const key = Buffer.from(data as string, "base64");

  const recovered = decryptWithKey(() => key, envelope);
  const recoveredSha = createHash("sha256").update(recovered, "utf8").digest("hex");
  const match = recoveredSha === expected_sha256;

  console.log("READER (process B): pid", process.pid);
  console.log("  key loaded FRESH from Vault, length", key.length, "(value NOT printed)");
  console.log("  writer sha256   :", expected_sha256);
  console.log("  recovered sha256:", recoveredSha);
  console.log("  BYTE-IDENTICAL  :", match);
  console.log(`\nRESULT: ${match ? "PASS — ciphertext recoverable across processes" : "FAIL"}`);
  if (!match) process.exit(1);
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});
