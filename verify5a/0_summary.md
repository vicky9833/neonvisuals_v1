# Prompt 5a — Summary (foundation; hold for promote)

Occasion schema + festival seeding + departments CRUD (data foundation). Additive/expand +
reversible rename; no true drops. 5b migrates the engine's computation onto this foundation.

## Build health
- `npx tsc --noEmit` → **exit 0** (`_tsc.txt`)
- `npm run build` (Next 16 / Turbopack) → **GREEN**, Proxy middleware registered (`_build.txt`)

## Per-item pointers
| Item | Artifact | Result |
|------|----------|--------|
| 1 festival extend + 2027 seed | `1_festivals.md` | PASS — Diwali 2027 = 29 Oct (4 sources), region/faith/lead_days backfilled |
| 2 occasion_types config | `2_occasion_types.md` (`_acceptance_run.txt`) | PASS — §4A leads pinned (14/14/30/5/7), sensitive flags correct |
| 3 occasions instance table + RLS | `3_occasions.md` | PASS — isolation + own-dept manager + year-agnostic birthday |
| 4 departments CRUD + assignment | `4_departments.md` | PASS — CRUD RLS + Pro-gate + **4a own-dept PII RLS now LIVE** |
| 5 opt-in canonical + plan gates | `5_optin_gates.md` | PASS — observed_festivals deprecated; Free=3/Pro=all |

## Migrations (applied to shared DB + repo)
- `034_festival_calendar_extend_seed_2027` — region/faith/default_lead_days + backfill 2025/26 + seed 2027.
- `035_occasion_types` — config table + seed (19 types) + RLS (tenant read / platform write).
- `036_occasions` — per-company instance table + §6A RLS (can_read/can_write_occasion) + year-agnostic recurrence.
- `037_deprecate_observed_festivals` — rename companies.observed_festivals → _deprecated_.

## Code
- `plan-gate.ts` extended: canUseDepartments, canUseApprovals, festivalLimit (+ reason codes/messages).
- `departments/queries.ts` + `/api/departments` (+ `/[id]`) routes + `/dashboard/settings/departments` UI.
- `database.ts` companies Row: observed_festivals → _deprecated_observed_festivals (type accuracy).

## Residue
Zero. All t5a_ rows deleted (owner-member teardown via MCP disable-trigger; users via `_cleanup_users.mjs`).
Final: companies=0, occasions=0, company_festivals=0, t5a_ users=0.

## STOP-for-decision points (confirm on promote)
1. **Eid al-Fitr 2027 = 2027-03-09 (ESTIMATED, moon-dependent)** — pre-computed estimate; may shift ±1
   on moon sighting. Row description marks it "estimated". Confirm or adjust nearer the date.
2. **Makar Sankranti 2027 = 2027-01-14** — calendarlabs shows Jan 15; seeded Jan 14 (standard + matches
   existing rows). Minor ±1, low stakes. Confirm if exactness matters.
3. **§4B/§4C occasion_types default_lead_days are PROVISIONAL** — only §4A person leads (14/14/30/5/7) and
   §4D festival leads were numerically spec-pinned. §4B/§4C leads (wedding 30, new_baby 21, promotion 7, …)
   are sensible defaults pending the spec's §4B/§4C tables. `default_budget` left null.
4. **PostgREST schema-cache lag** — new tables needed a `NOTIFY pgrst,'reload schema'` before the API saw
   them (hit during acceptance). Noted for the deploy: prod PostgREST reloads on migration, but confirm in smoke.
5. **Festival Free=3 enforcement** — `festivalLimit` is defined; the actual cap enforcement at the opt-in
   write path is a small follow-on (opt-in mechanism = company_festivals, unchanged). Confirm scope.

## NOT built (explicitly 5b / later): auto-generation engine, lead-time computation, blackout logic,
## touching the reminders cron. Foundation only. **Not promoted. Holding for your go.**
