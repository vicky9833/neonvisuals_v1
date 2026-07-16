# Item 3 — /upload route + upload infra — PASS (mechanisms) 

## The route (retires the 501 stub)
`POST /api/employees/upload` (`src/app/api/employees/upload/route.ts`):
1. `requireApiAuth` → company; **Pro-tier gate** `canImport` (platform/override bypass) → 403 by-code;
2. **role gate** `requireTenant("employees.bulk_import")` (owner/admin/hr);
3. multipart file; **size cap** (5MB → 413), **type check** (.csv/.xlsx/.xls → 400);
4. **malware-scan seam** `scanUploadOrThrow` (SEE decision below);
5. `parseUploadWithMeta` — in-memory parse (CSV text / XLSX no-formula); **file NEVER persisted**;
6. **header validation** (by-reference `bad_header` → 422) + **row cap** (>1000 → 422 `row_limit`);
7. `validateCSVRows` → split; `bulkCreateEmployees(valid)` (encrypt-on-write, item 1);
8. `recordImportJob` (rows_total/ok/failed + errors_json by-reference); returns by-reference summary.

Upload infra: in-memory stream-parse (no raw-file persistence), 5MB byte cap, 1000-row cap,
header validation, extension allowlist. `import_jobs` stores `source` + `file_size` only (no filename).

## Acceptance (script `_upload_mech.ts`, run `_upload_mech_run.txt`) — PASS
```
parseUploadWithMeta parses CSV bytes server-side                    PASS
missing email header -> bad_header by-reference (no value)          PASS
valid headers -> no issues                                          PASS
IMPORT_MAX_ROWS = 1000 (§10.12 cap)                                 PASS
import_jobs row records totals + by-reference errors_json           PASS
errors_json contains NO PII (row/field/code only)                   PASS
import_jobs.status CHECK rejects invalid status                     PASS
import_jobs.source CHECK rejects invalid source                     PASS
```
(Fixed a latent bug: `rowsFromRecords` seeds name/email keys, so header validation now uses the
CANONICAL source headers from `parseUploadWithMeta`, not row keys.)

The DEPLOYED upload → parse → validate → ENCRYPTED insert + oversized/over-row-cap/bad-header
rejections end-to-end is proven on the preview in the push+smoke phase.

## ⚠️ STOP-for-decision: malware scan
There is **NO malware scanner on this stack** (Vercel serverless + Supabase; files are parsed in
memory, never persisted). Per the prompt I did NOT silently skip it — `scanUploadOrThrow`
(`src/lib/employees/upload-scan.ts`) is the single seam, currently a documented no-op with
mitigations (size/row caps, no formula eval, no persistence, authed Pro-only). **Decide:
stub (current) / defer to a focused prompt / integrate a scan API.**
