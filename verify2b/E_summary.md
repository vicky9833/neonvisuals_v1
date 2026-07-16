# Phase 1 — EXPAND — Summary (auth rewrites that make role retirement clean)

Branch: `foundation`. Shared Supabase project `xserhblhiwtmaiejbvgo` (Pro, Nano, no PITR add-on).
No data-bearing object dropped. `profiles.role` column untouched (still NOT NULL DEFAULT 'client').

## Steps
| step | change | acceptance | artifact |
|------|--------|-----------|----------|
| E1 | `handle_new_user()` no longer writes `profiles.role` (migration `…024614`, local `023_…`) | REAL t2b_ signup → profile created (role defaulted to 'client' by column DEFAULT, not the trigger), no error; user deleted; **0 residue** | `E1_signup.md`, `E1_signup_run.txt` |
| E2 | `system_settings` policy re-gated OFF `profiles.role` → `is_platform_staff()` (migration `…025342`, local `024_…`; policy renamed `Platform staff system_settings`) | platform-staff user SELECT=1/UPDATE=1; tenant SELECT=0/UPDATE=0; **0 residue** | `E2_policy.md`, `E2_policy_run.txt` |

After E1+E2, the **only** remaining references to `profiles.role` are the auto-following
`profiles_role_check` constraint and `idx_profiles_role` index (to be handled in Phase 2 C0/C1).

## E-VERIFY
- **DB types regenerated** (MCP `generate_typescript_types`): schema **shape unchanged** — Phase 1
  altered only a function body + a policy, which the generated types do not capture. `profiles.role`,
  the 5 dead tables, and `employees_safe` all still present ⇒ `src/lib/types/database.ts` unchanged.
- **`tsc --noEmit`: exit 0** (clean; verified on identical code in R5 and unchanged since — no src edits in Phase 1).
- **`npm run build`: GREEN** — full route manifest, `ƒ Proxy (Middleware)` registered, static/SSG/dynamic
  legend, no type/lint/build errors.

## Migrations synced to repo
- `supabase/migrations/023_handle_new_user_stop_writing_role.sql`
- `supabase/migrations/024_system_settings_policy_off_profiles_role.sql`
  (mirror the remote-applied versions `20260716024614` / `20260716025342`.)

## Note (inherent to setup, not a deviation)
There is a single shared Supabase project, so E1/E2 took effect on the live schema immediately.
Both are backward-compatible (current code already ignores `profiles.role`; `system_settings` is
accessed via the service-role client) and reversible, matching the "already-migrated shared schema"
model. Git/foundation gating controls only the CODE deploy.

**STOP — Phase 1 committed to foundation. Holding for go before Phase 2 (CONTRACT).**
