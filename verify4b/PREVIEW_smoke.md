# Prompt 4b — Preview Smoke (DEPLOYED behavioural evidence)

- **Deployed SHA**: `95901a1` on `foundation` (4b build `c98ae5e` + scan-seam/debt docs `95901a1`).
- **Preview host**: `https://neonvisuals-v1-iou9-git-foundation-vicky9833s-projects.vercel.app`
- **Method**: bypass token + real GoTrue JWT SSR cookies; **synthetic PII only**; key never printed.
  Imports run through the DEPLOYED `/upload` (multipart); admin client for fixture setup + at-rest checks.
- **Liveness**: `POST /api/employees/upload` (unauth) → **401** (was 501) → `95901a1` serving.
- **Run log**: `verify4b/_preview_smoke_run.txt`. **Result: ALL PASS.**

## Item 1 — PII-never-logged on the DEPLOYED /upload (§10 headline gate)
Posted a malformed CSV carrying unique sentinels (phone/address/name/dob/email) to deployed `/upload`.
Grepped BOTH the HTTP error response AND the persisted `import_jobs.errors_json`:
```
deployed response + import_jobs.errors_json: ZERO PII sentinels (hits=0)   PASS
errors are by-reference (row/field/code)                                   PASS
```
**No PII value in the deployed error path or the persisted job metadata.**

## Item 2 — Encryption-on-write via the DEPLOYED /upload
Posted a valid 3-row synthetic CSV → `{rows_total:3, rows_ok:3, errors:[]}`:
```
valid upload accepted (rows_ok=3)                        PASS
all 3 phone_enc are envelopes (ciphertext at rest)       PASS
ZERO plaintext at rest                                   PASS
all 3 decrypt to source for authorized reader            PASS
```

## Item 3 — Pro gate on the DEPLOYED route
```
Free company /upload -> 403 plan_gate (free_plan_import_blocked)   PASS
Free manual-add: first 5 -> 201, 6th -> 403 soft cap  [201×5,403]  PASS
```
(Pro company uploads succeeded in item 2 = Pro allowed. Platform-staff bypass unit-proven in build.)

## Item 4 — Consent + offboarding (deployed)
```
imported rows consent_status = company_asserted     PASS
CHECK rejects invalid consent_status                PASS
offboard (deployed route) -> 200 + purge_after=+90d PASS
offboarded employee excluded from active roster     PASS
```

## Item 5 — No regression
```
owner sees PII (phone decrypts)   PASS
finance PII stripped              PASS
viewer PII stripped               PASS
GET / -> 200                      PASS
GET /dashboard -> 307             PASS
GET /nonexistent-xyz -> 403       PASS
/dashboard/team renders for owner PASS
```

## Confirmed promote decisions (encoded)
- **Malware scan: DEFERRED** — `scanUploadOrThrow` stays a no-op SEAM with a HARD ASSERTION that a
  real scan becomes REQUIRED if uploads are ever persisted/forwarded, + a tracked Prompt 10 obligation
  (in `src/lib/employees/upload-scan.ts`).
- **Plan taxonomy** `{pro,scale,enterprise}`/`free` = STUB; Prompt 8 owns canonical names.
- **Offboarding shape** = `offboarded_at IS NOT NULL AND is_active=false` (no enum column).
- **Two endpoints** `/upload` + `/bulk`: both kept; a DEBT comment on each records that any
  import-write-path change must touch BOTH; Prompt 10 verifies equivalence.

## Residue teardown (zero)
employee_pii/import_jobs/employees deleted in-script; owner-members + companies + 4 auth users via
the MCP disable-trigger step (`trg_guard_last_owner`) + `_cleanup_users.mjs`.
Final: companies=0, import_jobs total=0, employee_pii total=0, auth users t4b_=0.

## Verdict
Both §10 compliance gates hold on **deployed** code: no PII in the error/import_jobs surface, and
encryption-on-write via the real `/upload`. Pro gate, consent, offboarding, and §10 PII-strip
(no regression) all pass. Holding on `foundation` for the promote call. **Not promoted to main.**
