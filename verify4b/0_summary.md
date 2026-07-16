# Prompt 4b — Summary (foundation; hold for promote)

CSV/XLSX import + consent + offboarding + Pro-tier gate stub. This is where real employee PII
first enters the import pipeline — so the compliance gate (items 1-2) was proven on SYNTHETIC
data before wiring the upload route.

## Compliance gate — BOTH PASSED (proven on synthetic data)
- **Item 1 encryption-on-write at bulk**: 1000/1000 employee_pii rows land as `{v,iv,tag,ct}`
  envelopes, ZERO plaintext at rest, all decrypt for an authorized reader (`1_encrypt_on_write.md`).
- **Item 2 PII-never-logged (§10.12-13)**: adversarial malformed import → ZERO PII sentinels in
  any error/report/log; error report is by-reference (row/field/code) (`2_no_pii_logs.md`).

## Build health
- `npx tsc --noEmit` → **exit 0** (`_tsc.txt`)
- `npm run build` (Next 16 / Turbopack) → **GREEN**, Proxy middleware registered (`_build.txt`)

## Per-item pointers
| Item | Artifact | Result |
|------|----------|--------|
| 1 encryption-on-write | `1_encrypt_on_write.md` (`_encrypt_on_write_run.txt`) | PASS — 1000/1000 encrypted, 0 plaintext |
| 2 PII-never-logged | `2_no_pii_logs.md` (`_no_pii_logs_run.txt`) | PASS — 0 sentinel hits, by-reference |
| 3 /upload + infra | `3_upload.md` (`_upload_mech_run.txt`) | PASS (mechanisms) — deployed e2e in smoke |
| 4 consent canonical | `4_consent.md` (`_gates_run.txt`) | PASS — CHECK + duplicate retired |
| 5 plan-gate stub | `5_plan_gate.md` (`_gates_run.txt`) | PASS — Free denied / Pro allowed / bypass |
| 6 offboarding | `6_offboarding.md` (`_gates_run.txt`) | PASS — purge_after +90d, roster-excluded |

## Migration (applied to shared DB + repo)
- `033_import_jobs_and_consent` — employee_pii.consent_status CHECK {company_asserted,
  employee_confirmed, withdrawn}; retire employees.consent_status → _deprecated_; import_jobs
  table (+ RLS, source/status CHECKs, by-reference errors_json, anon revoked).

## Code
- Reconciled to ONE parser: deleted `src/lib/utils/csv-parser.ts` (unused); `employees/csv.ts` canonical.
- csv.ts: by-reference `validateCSVRows`/`downloadErrorReport`; server `parseUploadWithMeta`/`parseCsvText`;
  `validateHeaders(headers[])`; `IMPORT_MAX_ROWS`/`IMPORT_MAX_BYTES`.
- Routes: `/upload` real (retires 501), `/bulk` hardened (Pro gate + import_jobs + by-ref),
  `POST /employees` Free 5-cap, `/[id]/offboard` new.
- `plan-gate.ts` (Pro/manual gates), `upload-scan.ts` (scan seam), queries.ts (encrypt-on-write bulk,
  recordImportJob, getCompanyPlanContext, offboardEmployee). CSVUpload posts the file to /upload.

## Residue
Zero. All t4b_ rows deleted same-run (no members created → no last-owner-guard step needed).
Final residue checks in each run = 0 companies/pii/import_jobs.

## STOP-for-decision points (confirm on promote)
1. **Malware scan (item 3):** NO scanner on this stack. `scanUploadOrThrow` is a documented seam
   (no-op) with mitigations (size/row caps, no formula eval, no file persistence, authed Pro-only).
   Decide: keep stub / defer to a focused prompt / integrate a scan API. (Surfaced, not skipped.)
2. **Plan taxonomy (item 5):** `PRO_PLANS = {pro, scale, enterprise}`, "Free = 'free'" assumed
   (plan defaults to 'free'; 0 companies). Confirm names or let Prompt 8 own them via the seam.
3. **"status=offboarded" shape (item 6):** modelled as `offboarded_at IS NOT NULL AND is_active=false`
   (no literal status column — matches existing schema + the set_purge_after trigger). Confirm, or
   add an explicit enum column.
4. **Two import endpoints:** `/upload` (multipart, canonical, UI uses it) + `/bulk` (JSON, hardened,
   kept for API/back-compat). Both Pro-gated + record import_jobs + by-reference. Confirm keeping both.

## NOT built (explicitly deferred): purge executor, anonymised-aggregate retention, departments CRUD (Prompt 5).
Foundation only. **Not promoted. Holding for your go.**
