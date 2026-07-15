# C7 — DEAD-TABLE CENSUS (census only — nothing dropped)

## Row counts (all exist, all empty)
| table | exists | rows |
|-------|--------|------|
| gift_history | ✅ | 0 |
| kits | ✅ | 0 |
| kit_items | ✅ | 0 |
| quote_items | ✅ | 0 |
| recommendation_logs | ✅ | 0 |
| (ref) gift_records | ✅ | 0 |
| (ref) employee_preferences | ✅ | 0 |

## Inbound FKs pointing INTO these tables
| target | referenced by | constraint | live table? |
|--------|---------------|-----------|-------------|
| **kits** | **quotes.kit_id** | `quotes_kit_id_fkey` | **YES — `quotes` is a live table** |
| kits | kit_items.kit_id | `kit_items_kit_id_fkey` | no (intra-dead) |
| gift_history | — | none | — |
| quote_items | — | none | — |
| recommendation_logs | — | none | — |

⚠️ **`kits` cannot be trivially dropped**: the live `quotes` table has a FK
`quotes.kit_id → kits(id)`. Dropping `kits` requires first removing/altering
`quotes.kit_id`. The other four (`gift_history`, `kit_items`, `quote_items`,
`recommendation_logs`) have no inbound FKs from live tables.

## Code references (ripgrep, `src/**/*.{ts,tsx}`)
- `from("gift_history"|"kits"|"kit_items"|"quote_items"|"recommendation_logs")` → **0 matches.**
- Bare `gift_history` / `quote_items` / `recommendation_logs` string literals → **0 matches.**
- The word "kits" appears only in **marketing copy, image paths, and pricing `kitCount`
  labels** — never as a DB table reference.
- Memory engine uses `gift_records` + `employee_preferences` (NOT `gift_history`), so
  `gift_history` is superseded/dead in code.

**Conclusion:** none of the 5 candidate tables are referenced in application code.

## PITR / Point-In-Time Recovery — **NOT ENABLED**
- The Supabase **organization is on the `free` plan** (org `rssilpiwhbwualqqlgkx`, "Neon Visuals").
- PITR is a Pro/paid add-on; on the free plan it is **not available and not enabled**. There
  is effectively **no PITR safety net** for this project right now.
- ⚠️ **Discrepancy flagged:** steering (`tech-stack.md`) states "Supabase **Pro**", but the
  live org plan is **free**. This matters for any destructive migration later (no PITR to
  roll back to). Confirm plan/backup posture before any DROP in a future prompt.

## Headline
All 5 tables exist and are empty with no code references — safe drop candidates in
principle. BUT `kits` is FK-referenced by the live `quotes` table (must unwire
`quotes.kit_id` first), AND the project is on the **free plan with no PITR**, so any future
drop carries no point-in-time rollback. Census only — nothing dropped.
