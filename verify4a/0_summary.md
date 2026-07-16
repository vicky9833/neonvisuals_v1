# Prompt 4a — Summary (foundation; hold for promote)

Employee PII structure + app-layer AES-256-GCM encryption on the EMPTY employees table
(0 rows → structure-only, zero data risk). Additive/expand + reversible rename; no true drops
(employees_safe view dropped with DDL snapshot, no data).

## Gate status
**Item 2 KEY-RECOVERY PASSED** — a fresh process recovered ciphertext byte-identical using only
the Vault key. Real PII may enter encrypted storage in 4b. (All 4a values synthetic.)

## Build health
- `npx tsc --noEmit` → **exit 0** (`_tsc.txt`)
- `npm run build` (Next 16 / Turbopack) → **GREEN**, Proxy middleware registered (`_build.txt`)

## Per-item pointers
| Item | Artifact | Result |
|------|----------|--------|
| 1 crypto helper + Vault key | `1_crypto.md` (`_crypto_run.txt`) | PASS — round-trip byte-identical, tamper rejected |
| 2 key recovery (GATE) | `2_key_recovery.md` (`_key_recovery_run.txt`) | **PASS** — two-process byte-identical |
| 3 employee_pii + §6A RLS | `3_pii_table.md` (`_rls_acceptance_run.txt`) | PASS — owner/admin/hr + mgr-own-dept read; finance/viewer/other-dept DENIED; leak closed |
| 4 kill employees_safe + repoint | `4_view_kill.md` | PASS — view gone, 7 PII cols → _deprecated_, code repointed |
| 5 department text → FK | `5_dept_fk.md` | PASS — RLS on department_id, text col deprecated |
| 6 routes under matrix | `6_routes.md` | PASS — edit/view_pii/bulk_import gates; authorize() decisions proven |

## Migrations (applied to shared DB, foundation)
- `030_pii_key_custody` — Vault DEK `pii_dek_v1` (generated in-DB) + `get_pii_dek(int)` service_role-only RPC.
- `031_employee_pii_table` — employee_pii + §6A RLS helpers (can_read/can_write_employee_pii).
- `032_employees_pii_split_and_dept_fk` — drop employees_safe, employees_read RLS, rename 7 PII cols + department + profile_notes to _deprecated_, drop duplicate updated_at trigger.

## Housekeeping (Decision I) — folded in
- Duplicate `employees_updated_at` trigger dropped (kept `trg_employees_updated_at`).
- `profile_notes` deprecated (single notes home = employee_pii.notes).
- Two CSV parsers (`employees/csv.ts`, `utils/csv-parser.ts`) — NOTED for 4b (import not built here).

## Residue
Zero. t4a_ acceptance rows torn down (owner-row + owner auth-user via the MCP disable-trigger
step for `trg_guard_last_owner`, then `_cleanup_users.mjs`). Final: companies=0, employee_pii=0,
auth users t4a_=0. Temp `_recovery_ct.json` deleted.

## STOP-for-decision points (confirm on promote)
1. **Matrix realignment (item 6):** `employees.view_pii` manager cell changed **"N" → "own-dept"**
   to match your item-3/item-6 §6A (manager-own-dept sees PII). This edits a matrix marked
   "verbatim from spec". Confirm §6A intends manager-own-dept PII (my read of the prompt), OR I
   revert the cell AND drop the manager clause from `can_read_employee_pii`.
2. **consent_status duplication:** per item-3 the column lives on `employee_pii` (canonical);
   the pre-existing `employees.consent_status` was NOT in your rename list so it remains as an
   unused duplicate. Flagged for reconciliation in 4b (consent-on-import). Confirm employee_pii
   is the canonical home.
3. **Department on create/import deferred (Decision D consequence):** free-text department NAME →
   department_id resolution needs departments CRUD (Prompt 5); until then create/import do not
   persist a department. Confirm acceptable, or specify interim behaviour.
4. **Route identity-read is baseline-member (not a matrix capability):** the roster/list GET uses
   `requireApiAuth` (RLS employees_read = all-member) because no matrix capability cleanly models
   "list team" for managers without per-row dept context. Sensitive ops (edit/view_pii/import) ARE
   matrix-gated. Confirm this boundary.
5. **DB types:** `database.ts` is the hand-curated partial (employees not in Tables; clients
   untyped). Updated it by removing the dropped `employees_safe` view + adding `get_pii_dek`.
   Did NOT overwrite with full generated types (preserves the existing pattern); tsc/build green.

## NOT built (explicitly 4b): import/upload endpoint, consent-on-import, offboarding/purge, plan-gate.
Foundation only. **Not promoted. Holding for your go.**
