# Item 1 — Encryption-on-write at bulk — PASS

## Parser reconciliation
The unused second parser `src/lib/utils/csv-parser.ts` (`parseEmployeeCsv`, zero callers) was
DELETED. `src/lib/employees/csv.ts` is now the single validated parser/write path
(client `parseFile` + server `parseUploadWithMeta`/`parseCsvText`).

## Write path
`bulkCreateEmployees` (used by /upload + /bulk) routes `phone` + `delivery_address` through
`encryptPII()` → `encryptWithKey()` before inserting into `employee_pii`; city/pincode/dob/notes
stay plaintext (RLS-gated, per 4a).

## Acceptance (script `_encrypt_on_write.ts`, run `_encrypt_on_write_run.txt`) — PASS
Exercises the SAME core the route uses (encryptPII → encryptWithKey) at 1000-row scale:
```
inserted 1000 employees                                             PASS
read back 1000 employee_pii rows                                    PASS
ALL 1000/1000 rows have envelope phone_enc + delivery_address_enc   PASS
ZERO plaintext at rest (leaks=0)                                    PASS
ALL 1000/1000 decrypt to source for authorized reader (ok=1000)     PASS
residue companies t4b_ = 0                                          PASS
```
1000/1000 encrypted envelopes `{v,iv,tag,ct}`, zero plaintext at rest, all decrypt.
tsc `--noEmit` exit 0; `npm run build` GREEN.

(The deployed route → bulkCreateEmployees end-to-end encrypted insert is proven on the preview
in the push+smoke phase; this proves the mechanism + DB outcome at 1000 scale on real DB.)
