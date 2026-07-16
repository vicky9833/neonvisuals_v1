# Item 2 — Key-recovery proof (THE GATE) — PASS

Proves a SEPARATE, FRESH process holding only the Vault key can decrypt ciphertext
written by a different process → "a new deploy can read old ciphertext" = data is
recoverable. Scripts: `_key_recovery_write.ts` (process A), `_key_recovery_read.ts`
(process B). Run: `_key_recovery_run.txt`.

- **Process A (writer, pid 32468)**: loaded key from Vault, encrypted a synthetic value,
  wrote ONLY the envelope + a sha256 of the plaintext to disk. Plaintext and key never
  persisted. Process exits (in-memory key dropped).
- **Process B (reader, FRESH process, pid 18320)**: independent process, fresh env load,
  no shared memory. Loaded the key FRESH from Vault, decrypted the envelope.

```
writer sha256   : c622f84330b1ac1d221cbbc0dfa04968841fc4f0c99922626e18f4bd1b7cd228
recovered sha256: c622f84330b1ac1d221cbbc0dfa04968841fc4f0c99922626e18f4bd1b7cd228
BYTE-IDENTICAL  : true
RESULT: PASS — ciphertext recoverable across processes
```

Distinct PIDs confirm two OS processes. **Key-recovery is PROVEN — the gate for 4b is
cleared.** Real PII may go into encrypted storage in 4b. (Synthetic values only here.)
