# Prompt 6a — PREVIEW SMOKE (deployed foundation preview) — PASS

Deployed foundation preview: `https://neonvisuals-v1-iou9-git-foundation-vicky9833s-projects.vercel.app`
(bypass token + real JWT SSR cookies). Foundation SHA `49eb3d9` (dashboard-confirmed READY/green in
Vercel BEFORE smoking). Migration 040 (dedupe) on the shared DB. Run: `verify6a/_preview_smoke.ts`
(evidence `_preview_smoke_run.txt`). **RESULT: PASS** — zero t6a_ residue.

## What is proven deployed-HTTP vs engine-against-deployed-DB
- **Deployed-HTTP (through the deployed serverless functions):** the bell API (`GET/PATCH
  /api/notifications`, `PATCH /api/notifications/[id]`), the membership **role-change ROUTE**
  (`PATCH /api/team/members/[userId]` — the engine runs INSIDE a deployed fn, writing in-app +
  ONE email), `/api/employees` PII-strip, and the public surface.
- **Committed engine on the DEPLOYED DB:** the occasion in-app / dedupe / wa.me / PII bits run the
  committed `notifyOccasionAtLeadTime` against the shared (deployed) DB + its deployed unique index
  (migration 040). The deployed cron runs this SAME engine. The global cron was intentionally NOT
  triggered (it emails all real tenants + the ops digest on the shared DB) — same safety precedent
  as the 5b prod smoke.

## Per-item results (all PASS)
| Item | Check | Result |
|------|-------|--------|
| liveness | deployed `GET /api/notifications` returns seeded row (warm poll) | PASS |
| 1 bell deployed | hr sees ONLY own (RLS, not company B's); unread-first; unread=2; mark-read → read_at + unread=1; company-B user sees only own (isolation) | PASS |
| 2 dedupe | two "cron runs" (different occasion.id, same stable identity) → **exactly ONE** occasion in-app per recipient (hr + platform ops); a distinct occasion still notifies | PASS |
| 3 no double-email | deployed role-change route → in-app to affected+owner AND **exactly ONE** `member_role_changed` email; occasion in-app `channels_sent=[in_app]` only (cron owns the company email) | PASS |
| 4 PII-safe (§10.13) | ZERO sentinel in notification TITLES / LINKS / email SUBJECTS; tenant BODY names the employee (authorised, RLS) so the grep is non-vacuous | PASS |
| 5 wa.me deployed | occasion ops notification link = well-formed `wa.me/919876500055` + org context, NO employee PII; (omitted-when-no-phone proven in `_triggers.ts`) | PASS |
| 6 no regression | finance PII stripped; owner sees PII; `/`→200, `/dashboard`→307, `/nonexistent-xyz`→403; `/dashboard/team`→200; public `/api/contact` accepts a lead | PASS |

## Residue
Zero. Smoke self-tears-down (finally); org_owner members + companies via MCP disable-trigger
(`trg_guard_last_owner`); auth users via `_cleanup_users.mjs`. The `/api/contact` regression lead
(leads.`contact_email`) was cleaned via MCP (the smoke's cleanup column bug — `email` vs
`contact_email` — is fixed in the committed script). occasion_ops rows resolving to the real
founder were tied to t6a_ company_ids and cascade-cleaned. Final (MCP): companies=0,
notifications=0, notification_prefs=0, t6a leads=0, t6a email_log=0, users=0.
NOTE: `/api/contact` sends one internal "new lead alert" email to ops (founder) by design — an
internal address, not a client.

## Deploy status
Foundation preview live + green on `49eb3d9`. **HOLDING for the promote call — not touching main.**
