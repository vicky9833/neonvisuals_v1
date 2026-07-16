# C0 — Phase 2 Safety Net (setup) — HOLDING: backup blocker

Branch `foundation`. Read-only recon + snapshot done; **no rename executed.**

## 1. On-demand physical backup — ⛔ CANNOT TRIGGER WITH AVAILABLE TOOLING
The Supabase MCP exposes **no backup/PITR tool**, and there is **no Management-API access
token** in `.env.local` (only app anon/service-role keys + the Vercel bypass token). On-demand
physical backups are created via the dashboard (**Database → Backups → "Backup now"**) or the
Management API `POST /v1/projects/xserhblhiwtmaiejbvgo/database/backups` — neither reachable here.

Per C0 ("Fresh on-demand physical backup … do FIRST, before any rename") and the standing rule
(don't work around a missing prerequisite — STOP), **I am holding before C1/C2/C3.**

**Unblock (either):**
1. You trigger the on-demand backup in the dashboard and paste the timestamp, **or**
2. Provide a `SUPABASE_ACCESS_TOKEN` and I'll `POST …/database/backups`, then record the timestamp.

Backup floor to record here once taken: `__________` (UTC). Note: the project is Pro, so
automatic **daily** physical backups exist regardless; C0 asks for a fresh on-demand one as the
explicit floor that predates the renames.

> Reversibility note: Phase 2 only RENAMEs (never drops), and the full DDL is snapshotted below,
> so the primary restore path is a one-line rename-back + this snapshot. The physical backup is an
> additional floor for the later true-DROP housekeeping pass. It remains an explicit C0 gate, so
> renames are held until it exists.

## 2. DDL snapshot — ✅ DONE (committed)
`./verify2b/schema_snapshot_2026-07-16.sql` — captured read-only from live, reality matched
recon R2/R4 exactly:
- `profiles.role` = `text NOT NULL DEFAULT 'client'::text`; `profiles_role_check`
  (`role IN (super_admin,admin,client)`); `idx_profiles_role` btree(role).
- `quotes.kit_id` = `uuid NULL`; `quotes_kit_id_fkey → kits(id) ON DELETE SET NULL`.
- 5 dead tables: full `CREATE TABLE` + PKs + FKs + indexes; **RLS ENABLED, ZERO policies**;
  only trigger = `kits.trg_kits_updated_at`. All 0-row; `quotes` 1 row with `kit_id IS NULL`.

## 3. Dependency re-confirm (post E1/E2) — ✅ PASS
- **Code (`src/**`):** ZERO reads of `profiles.role`. All `.role`/`'role'` hits are
  `platform_staff.role` / `company_members.role` (two-plane), employee `brief.role` / CSV
  `row.role`, UI/testimonial fields, or deprecation comments.
- **DB objects:** the sweep flagged only `public.handle_new_user`, which is a **false positive** —
  its sole `role` occurrence is the E1 comment `"…no longer writes profiles.role (deprecated)"`;
  the actual INSERT is `(id, email, full_name)` with no `role` column. Verified via
  `pg_get_functiondef`.
- Therefore the ONLY remaining references to `profiles.role` are the auto-following
  `profiles_role_check` + `idx_profiles_role` — exactly as required to proceed. ✅

## Planned C1–C3 (NOT executed — awaiting backup)
- **C1** `ALTER TABLE public.profiles RENAME COLUMN role TO _deprecated_role;`
  Restore: `… RENAME COLUMN _deprecated_role TO role;` · snapshot §C1 · floor = C0 backup ts.
- **C2** `ALTER TABLE public.quotes DROP CONSTRAINT quotes_kit_id_fkey;`
  then `ALTER TABLE public.quotes RENAME COLUMN kit_id TO _deprecated_kit_id;` (kit_id IS NULL — no data moves)
  Restore: rename back + re-add FK from snapshot §C2 · floor = C0 backup ts.
- **C3** `ALTER TABLE public.<t> RENAME TO _deprecated_<t>;` for kits, kit_items, quote_items,
  gift_history, recommendation_logs (internal FKs auto-follow the rename).
  Restore: `ALTER TABLE public._deprecated_<t> RENAME TO <t>;` · snapshot §C3 · floor = C0 backup ts.

**STOP — holding for the on-demand backup (or a management token) before executing C1/C2/C3.**
