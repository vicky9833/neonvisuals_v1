/**
 * Prompt 4a item 1 — crypto round-trip + tamper, against the REAL module core
 * (../src/lib/services/pii-crypto-core.ts) using the REAL Vault key.
 * Synthetic values only — never real PII. The key value is never printed.
 * Run: npx tsx verify4a/_crypto.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { encryptWithKey, decryptWithKey } from "../src/lib/services/pii-crypto-core";

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
  console.log(`key loaded from Vault (name pii_dek_v1): length=${key.length} bytes (value NOT printed)`);
  if (key.length !== 32) throw new Error("key is not 32 bytes");

  const samples: Array<[string, string]> = [
    ["ascii", "9876543210"],
    ["address", "42, 3rd Cross, Indiranagar, Bengaluru"],
    ["unicode", "पूजा • πύλη • 😀🎁 • Ω"],
    ["long", "x".repeat(10_000)],
    ["empty", ""],
    ["json-ish", '{"a":1,"b":"}\\"quote"}'],
  ];

  let allOk = true;
  console.log("\n=== ROUND-TRIP ===");
  for (const [label, plain] of samples) {
    const envlp = encryptWithKey(key, 1, plain);
    const back = decryptWithKey(() => key, envlp);
    const ok = back === plain;
    allOk = allOk && ok;
    // Verify the stored envelope is real ciphertext, not plaintext.
    const parsed = JSON.parse(envlp) as { v: number; iv: string; tag: string; ct: string };
    const ctIsPlain = Buffer.from(parsed.ct, "base64").toString("utf8") === plain && plain !== "";
    console.log(
      `  ${label.padEnd(9)} len=${String(plain.length).padStart(5)} v=${parsed.v} ` +
        `roundtrip=${ok ? "OK" : "FAIL"} ciphertext!=plaintext=${!ctIsPlain}`,
    );
  }

  console.log("\n=== TAMPER (flip one ciphertext byte -> must REJECT) ===");
  const envlp = encryptWithKey(key, 1, "tamper-target-9876543210");
  const p = JSON.parse(envlp) as { v: number; iv: string; tag: string; ct: string };
  const ctBuf = Buffer.from(p.ct, "base64");
  ctBuf[0] ^= 0x01; // flip one bit
  const tampered = JSON.stringify({ ...p, ct: ctBuf.toString("base64") });
  let rejected = false;
  let leaked: string | null = null;
  try {
    leaked = decryptWithKey(() => key, tampered);
  } catch {
    rejected = true;
  }
  console.log(`  tampered ct -> ${rejected ? "REJECTED (threw, GCM auth)" : "ACCEPTED — LEAK: " + leaked}`);

  // Also tamper the auth tag.
  const tagBuf = Buffer.from(p.tag, "base64");
  tagBuf[0] ^= 0x01;
  const tagTampered = JSON.stringify({ ...p, tag: tagBuf.toString("base64") });
  let tagRejected = false;
  try {
    decryptWithKey(() => key, tagTampered);
  } catch {
    tagRejected = true;
  }
  console.log(`  tampered tag -> ${tagRejected ? "REJECTED (threw, GCM auth)" : "ACCEPTED — LEAK"}`);

  const verdict = allOk && rejected && tagRejected;
  console.log(`\nRESULT: ${verdict ? "PASS" : "FAIL"}`);
  if (!verdict) process.exit(1);
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});
