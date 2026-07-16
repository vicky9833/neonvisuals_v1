# Item 1 — Key custody + encryption helper (app-layer AES-256-GCM envelope)

## Key custody (Supabase Vault)
- Migration `030_pii_key_custody`: the 32-byte AES-256 DEK is **generated in-DB**
  (`extensions.gen_random_bytes(32)`) and stored in Vault as secret **`pii_dek_v1`**
  — the key value never transits the app, a script, or any log.
- Accessor RPC `public.get_pii_dek(int)` — SECURITY DEFINER, `search_path=''`, reads
  `vault.decrypted_secrets`. **`revoke all` from public/anon/authenticated; grant execute
  to `service_role` only.** A browser-reachable JWT cannot fetch the key.
- Versioned name (`pii_dek_v1`) + version carried in every envelope → rotation is
  incremental later, not big-bang.

## Encryption module
- `src/lib/services/pii-crypto-core.ts` — pure AES-256-GCM (no secrets/IO/`server-only`):
  `encryptWithKey`, `decryptWithKey`, `parseEnvelope`. Envelope `{v, iv, tag, ct}` (base64),
  random 96-bit IV per encryption, GCM auth tag.
- `src/lib/services/pii-crypto.ts` — `import "server-only"`; loads the key via the
  service-role RPC (cached per version) and exposes `encryptPII` / `decryptPII` /
  `encryptPIINullable` / `decryptPIINullable`. Cannot be bundled into client code.

## Acceptance (script `_crypto.ts`, run `_crypto_run.txt`) — PASS
Key loaded from Vault (name `pii_dek_v1`), length 32 bytes (value NOT printed).

ROUND-TRIP (byte-identical, ciphertext ≠ plaintext for all):
```
ascii     len=   10  roundtrip=OK
address   len=   37  roundtrip=OK
unicode   len=   22  roundtrip=OK   (पूजा • πύλη • 😀🎁 • Ω)
long      len=10000  roundtrip=OK
empty     len=    0  roundtrip=OK
json-ish  len=   22  roundtrip=OK
```

TAMPER (GCM authentication):
```
tampered ct  -> REJECTED (threw)
tampered tag -> REJECTED (threw)
```
A flipped ciphertext or tag byte fails decryption — never returns garbage.
