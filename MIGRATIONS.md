# Database migrations

Migrations live in `supabase/migrations/` as `NNN_description.sql` (e.g. `059_order_items_custom_line_fields.sql`).

## How migrations are applied: MANUALLY

There is **no automation** that applies migrations. CI (`.github/workflows/ci.yml`) runs type-check, the homoglyph guard, and tests. Vercel runs `next build`. **Neither touches the database.** A green build/CI does **not** mean the schema is up to date.

Migrations are applied by hand against the hosted project.

## `supabase db push` is BANNED

Do **not** run `supabase db push` on this project. The Supabase migration ledger (`supabase_migrations.schema_migrations`) stores CLI **timestamps** (e.g. `20260724120132`), but the repo files use **`NNN_` prefixes**. They cannot be matched by version string, so `db push` sees **none** of the applied migrations as recorded and would attempt to **re-run all of them** against a database that already has ~57 applied. Several early migrations are **not** idempotent (bare `ADD CONSTRAINT`, `CREATE POLICY`, `ALTER TYPE ... ADD VALUE`, data `INSERT`s) and would error partway, leaving a half-applied mess.

The ban stands until the ledger is reconciled in a dedicated phase (`supabase migration repair` / re-baseline). Until then, apply migrations individually.

## Correct apply procedure (apply the specific pending files only)

1. Identify the pending migration(s) — the CI migration-drift gate names them, or run `npm run check:migrations` locally with `SUPABASE_DB_URL_RO` set.
2. Apply **only** those files, in numeric order, one of:
   - **Supabase Dashboard → SQL editor**: paste the exact file contents and run. (Simplest; recommended.)
   - A reviewed one-off apply via the Supabase MCP `apply_migration` tool (records a ledger row).
3. Apply the **exact** file contents — do not edit, combine, or "improve" the SQL.
4. Verify the effect (the column/constraint/table the migration creates) before relying on it.

Do **not** apply `001`–`057` (already applied — verified in the Phase 0D audit).

## THE RULE: schema before code

**Apply a migration to the live database BEFORE merging code that depends on it.**

The failure this repo hit: code that inserted into new `order_items` columns shipped to production before the migration adding those columns was applied. Everything was green; order creation was broken at runtime. Applying schema first prevents this.

## The CI migration-drift gate

`.github/workflows/ci.yml` runs `.github/scripts/check-migrations-applied.mjs` on every PR and push to `main`. It does **not** use the (drifted) ledger; it verifies the **actual live schema** against a committed manifest.

- **`.github/migration-manifest.json`** has a `baseline` (migrations at/below it were verified applied in Phase 0D and are assumed present) and one entry per migration **above** the baseline. Each entry has either a `probe` (a read-only SQL `SELECT` returning a single boolean, `true` once the migration is applied) or `"dataOnly": true`.
- **Step A** (always runs, repo-only): every migration file numbered above the baseline **must** have a manifest entry — so a new migration cannot slip through unverified.
- **Step B** (needs the DB credential): runs each probe against the live DB and **fails the build**, naming any migration whose effect is absent.

### When you add a new migration `NNN` (above the baseline)
Add an entry to `.github/migration-manifest.json` keyed by its zero-padded number, e.g.:

```json
"060": {
  "file": "060_something.sql",
  "describes": "what it does, one line",
  "probe": "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='...' AND column_name='...')"
}
```

Prefer probing a column/constraint/table/function the migration creates. Keep the SQL read-only (`information_schema` / `pg_catalog` only). If the migration is data-only, use `"dataOnly": true` instead of a probe.

### Founder setup (one-time)
Create a **read-only** Postgres role in Supabase and store its connection string as the GitHub Actions repository secret **`SUPABASE_DB_URL_RO`** (Settings → Secrets and variables → Actions → New repository secret). The gate only reads `information_schema` / `pg_catalog`, so minimal privileges suffice. If the secret is absent (e.g. on fork PRs, which never receive secrets), the gate **skips Step B with a visible warning** — it never silently passes and never hard-fails for a missing credential.
