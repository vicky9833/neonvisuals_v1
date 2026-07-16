# Phase 2 — CONTRACT — Summary (deprecate via reversible rename)

Branch `foundation`. Pushed **Phase 1 + Phase 2 together**: `da69acd..2d3e82b`
(Phase 1 `4bc8d50` + Phase 2 `2d3e82b`). Never main. No data destroyed — every step is a RENAME.
C0 backup floor: **removed from this phase per your correction** (moves to the later true-DROP
housekeeping pass; renames are reversible + DDL snapshotted + zero row-data at risk).

## C0 (pre-flight)
- DDL snapshot committed: `verify2b/schema_snapshot_2026-07-16.sql` — matched recon R2/R4 exactly.
- Dependency re-confirm: only the auto-following check-constraint + index referenced
  `profiles.role`; the `handle_new_user` hit was the E1 **comment** (verified via function body);
  **zero** code reads. (`verify2b/C0_setup.md`)

## Steps + restore paths (all applied to live shared DB; local migrations 025/026/027)
| step | change | restore path |
|------|--------|--------------|
| **C1** | `ALTER TABLE public.profiles RENAME COLUMN role TO _deprecated_role;` (check-constraint + index auto-follow) | `ALTER TABLE public.profiles RENAME COLUMN _deprecated_role TO role;` · snapshot §C1 |
| **C2** | `ALTER TABLE public.quotes DROP CONSTRAINT quotes_kit_id_fkey;` then `RENAME COLUMN kit_id TO _deprecated_kit_id;` (kit_id was NULL — no data moved) | `RENAME COLUMN _deprecated_kit_id TO kit_id;` + re-add FK `quotes_kit_id_fkey → kits(id) ON DELETE SET NULL` (after kits un-deprecated) · snapshot §C2 |
| **C3** | `ALTER TABLE public.<t> RENAME TO _deprecated_<t>;` for `kit_items, kits, quote_items, gift_history, recommendation_logs` (internal FKs auto-follow) | `ALTER TABLE public._deprecated_<t> RENAME TO <t>;` (each) · snapshot §C3 |

Post-rename verification (SQL): `profiles.role` gone / `_deprecated_role` present; `quotes.kit_id`
gone / `_deprecated_kit_id` present; `quotes_kit_id_fkey` gone; old dead-table names gone; all 5
`_deprecated_*` present. ✅

## DB types
Regenerated via MCP `generate_typescript_types` — confirmed the deltas: `profiles._deprecated_role`,
`quotes._deprecated_kit_id`, and the 5 tables now `_deprecated_*`. The committed
`src/lib/types/database.ts` is a **hand-curated partial** (its `Tables` enumerate only `audit_log`
+ `companies`; it never declared `profiles.role`, `quotes.kit_id`, or the dead tables), so it
required **no edit** — nothing in it referenced the renamed objects. The real straggler-check is
tsc+build (below), which is green.

## E-VERIFY (tsc + build)
- `npx tsc --noEmit` → **exit 0** (no straggler still selecting `profiles.role` / `kit_id` / dead tables).
- `npm run build` → **GREEN**: full route manifest, `ƒ Proxy (Middleware)` registered, no errors.

## Preview smoke (foundation branch alias, bypass token, redirects not followed)
Run log: `verify2b/C_smoke_run.txt`.
> Note: Phase 1/2 changed only `supabase/migrations/*` + `verify2b/*` — **no `src/` changes** — so
> the deployed app code is byte-identical to the prior green preview (da69acd); `/admin`→307 is
> already true and does not distinguish the commit. The smoke validates the **live DB reality**
> (renamed columns) end-to-end through the app.

| check | result |
|-------|--------|
| App boots: `/`, `/login`, `/register`, `/products` | **200** |
| Gate live: `/admin` → 307 `/ops` ; `/dashboard` → 307 `/login?redirect=%2Fdashboard` | ✅ |
| **Real signup** (t2b_): profile row created, `_deprecated_role='client'` (default fills renamed col), no error | ✅ |
| Platform-staff reaches `system_settings` (SELECT rows=1) ; tenant denied (rows=0) | ✅ |
| Zero `t2b_` residue: profiles=0, auth.users=0 | ✅ |
| `platform_staff` remaining row = legit owner `contact.neonvisuals@gmail.com` (not test, not orphan) | ✅ |

## Verdict
Phase 2 complete and build-green; renames reversible; smoke passes end-to-end on the deployed
preview against the renamed schema. **STOP — holding for your promote call. Never main.**

## DEFERRED (recorded, NOT done)
- **True DROP of all `_deprecated_*` objects** — later housekeeping pass; that pass is where the
  on-demand physical backup floor is required (rename-back no longer exists once dropped).
- **`employees_safe` view-kill + PII split + field-level encryption + closing the
  city/pincode/notes leak** — Prompt 4 (one coupled unit). `employees`/`employees_safe` untouched here.
