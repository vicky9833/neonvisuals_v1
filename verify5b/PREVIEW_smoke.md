# Prompt 5b — PREVIEW SMOKE (deployed foundation preview) — PASS

Deployed foundation preview: `https://neonvisuals-v1-iou9-git-foundation-vicky9833s-projects.vercel.app`
(bypass token + real JWT SSR cookies). Foundation tip `10d1539`. Run: `verify5b/_preview_smoke.ts`
(evidence `_preview_smoke_run.txt`). **RESULT: PASS** — zero t5b_ residue.

## Liveness signal (5b adds NO new route)
The deployed `/dashboard` server component now calls `generateOccasions(companyId)` on load, so
rendering it as a test-company owner runs the DEPLOYED engine PER-COMPANY (no global cron side
effects). Signal: a FRESH test company gets `occasions` rows with `notify_date` + `auto_generated`
(the 5a dashboard did not write them). Confirmed live: **15 auto occasions w/ notify_date**.
Independently corroborated via the HTTP-only festival-cap signal (`_probe2.ts`): the deployed
`POST /api/occasions/festivals` enforces the Free=3 cap (added in 5b; 5a was uncapped).

## Per-item results (all PASS)
| Item | Check | Evidence |
|------|-------|----------|
| 1 cutover | reminders exist and every `reminder_date == an occasion.notify_date` (14 reminders); every occasion carries lead_days + notify_date | reminders are a downstream consumer of occasions |
| 2 milestone suppression | 10-yr → `milestone_anniversary` only (work_anniversary SUPPRESSED); 3-yr → `work_anniversary` only (no milestone) | ruling live on deployed code |
| 3 onboarding sign | onboarding `notify_date = joining_date − 5` (2026-08-01 vs join 2026-08-06, BEFORE join); null-joining employee → birthday ONLY | |
| 4 blackout ORG+PLATFORM + rush | Blackout birthday: ORG (occ−2,−3) + PLATFORM (occ−5,−6,−7) all skipped → notify pushed to **occ−19** (proves engine reads BOTH org `companies.blackout_dates` AND `platform_blackout_dates`); near birthday (~5d, lead 14) → `is_rush=true`; future onboarding (~15d) → `is_rush=false` | |
| 4b email once | dashboard occasion-reminder to contact logged **exactly once across 2 renders** (dedupe, no double-fire) | |
| 5 festival cap | Free opt-in 3 → 200; 4th → **403 free_festival_limit**; Pro opt-in 4 → 200 (unlimited) | deployed route |
| 6 no regression | finance PII stripped (§10); owner sees PII; manager reads own-dept PII (4a intact); `/`→200, `/dashboard`→307, `/nonexistent-xyz`→403; `/dashboard/team`→200 (3b intact) | |

## Harness finding (NOT a product bug — documented)
First smoke runs showed `/dashboard` rendering 200 but writing **0 occasions**. Root cause: the
dashboard resolves `company_id` via `getProfile()` → the `profiles` table. A signup TRIGGER
auto-creates a `profiles` row per auth user with `company_id = null`; the app links it to a company
during onboarding. Our admin-created test users had the trigger-made row but no company link, so
`getProfile()` returned `company_id = null` and the dashboard's `if (companyId)` guard skipped
generation. **Fix (test-only): UPDATE the profiles row to set `company_id`** (mirrors the app's
onboarding link step) — after which the deployed dashboard generated 15 occasions. This is a
test-scaffolding gap; real users (who complete onboarding) have a linked profile. The engine and
RLS are correct: `generateOccasions` under a real owner-JWT client writes occasions cleanly
(`_diag.ts`: 11; `_diag2.ts`: 11). The `requireApiAuth` path (API routes) resolves company via
`company_members` directly and was unaffected (festival cap enforced throughout).

## Residue
Zero. Smoke self-tears-down data; org_owner members + companies removed via MCP disable-trigger
(`trg_guard_last_owner`) step; `t5b_` auth users via `_cleanup_users.mjs`; global
`platform_blackout_dates` t5b_ rows deleted immediately after measurement. Final verification (MCP):
`companies=0, members=0, occasions=0, profiles=0, platform_blackout=0, email_log=0, users=0`.
Accumulated residue from failed early runs + probes/diags also swept (`_sweep.ts` + MCP + cleanup).

## Deploy status
Foundation preview live and green on `10d1539`. **HOLDING for promote — not touching main.**
