# Prompt 6a — Notification engine + in-app bell + fireable-now triggers — SUMMARY

Additive/expand; no true drops. foundation only; hold for promote. No schema change (the
`notifications` + `notification_prefs` tables from P1 already existed — 6a WIRES them).

## Build health (final committed tree)
- `npx tsc --noEmit` → **exit 0**
- `npm run build` (Next 16 / Turbopack) → **GREEN** (Proxy middleware; 296+ product pages)

## Per-item pointers
| Item | Artifact | Result |
|------|----------|--------|
| 1 role-audience resolution | `1_audience.md` (`1_audience_run.txt`) | **PASS** — hr/org_admin/org_owner/dept_manager/platform_admin resolve exactly; tenant isolation holds |
| 2 engine notify() + prefs (item 6) | `2_engine.md` (`2_engine_run.txt`) | **PASS** — 3 recipients → in-app per pref, email per pref (real Resend id; suppressed for email=false), channels_sent correct, RLS own-read |
| 3 bell (notifications, not reminders) | `3_bell.md` (`3_bell_run.txt`) | **PASS** — own-only (RLS), unread-first, unread count, mark-as-read; another user cannot mutate |
| 4 fireable-now triggers | `4_triggers.md` (`4_triggers_run.txt`) | **PASS** — occasion→tenant+platform in-app + wa.me (omitted w/o phone), no double-email; membership in-app to correct audiences |
| 5 PII-safety (§10.13) | `5_pii_safe.md` (`5_pii_run.txt`) | **PASS** — zero sentinels in titles/subjects/links; control catches a leak |
| 6 plan-gate + prefs UI | `6_prefs_gate.md` | prefs honored by engine (item 2); nothing new gated in 6a; visual prefs UI deferred (endpoints added) |

## PII-SAFETY (item 5) — PASSED
Adversarial grep of all notification TITLES, email SUBJECTS, and notification LINKS for employee
sentinels (name + phone) → **ZERO hits**. Tenant BODIES intentionally name the person (RLS-gated
authorised viewers) — proven present so the title-cleanliness is non-vacuous. Platform
notifications are entirely PII-free. Control leak proves the grep works.

## Code (additive)
- NEW `src/lib/engines/notifications.ts` — `resolveAudience/resolveAudienceSpec` (§7 role queries;
  tenant isolation), `notify()` (in-app + email per `notification_prefs`, channels_sent, service-role
  writes scoped to resolved recipients), `notifyOccasionAtLeadTime()` (tenant + platform + wa.me).
- NEW `src/lib/utils/wa.ts` — `buildOpsWaLink()` (ops→client wa.me, org context only, null w/o phone).
- NEW routes: `GET/PATCH /api/notifications`, `PATCH /api/notifications/[id]`, `GET/PATCH /api/notifications/prefs`.
- `src/lib/services/email.ts` — exported `sendNotificationEmail` (routes through the SAME sendEmail
  path — no parallel email path).
- `src/components/dashboard/NotificationBell.tsx` — repointed from `/api/reminders` to
  `/api/notifications` (own, unread-first, unread badge, mark-read / mark-all-read).
- Triggers wired IN-APP alongside existing emails (no double-email): occasion cron
  (`/api/reminders/cron`), member invited (`/api/team/invites`), joined (`invite/accept`), role
  changed + removed (`/api/team/members/[userId]`).

## Residue
Zero. All t6a_ fixtures swept; org_owner members + companies via MCP disable-trigger
(`trg_guard_last_owner`); auth users via `_cleanup_users.mjs`. Occasion_ops notifications that
resolve to the REAL founder (platform_admin) were tied to t6a_ company_ids and cascade-cleaned.
Final (MCP): notifications=0, notification_prefs=0, t6a companies=0, platform_staff=1 (founder
untouched), t6a email_log=0.

## STOP-for-decision (confirm on go)
1. **wa.me DIRECTION (ASSUMPTION — confirm/deny)**: the ops occasion notification's wa.me link
   targets the **CLIENT's contact number** (`companies.primary_contact_phone`), prefilled with org
   context (org name, plan, business contact name, occasion TYPE — NO employee PII), so an ops
   person taps it to WhatsApp the client. Omitted gracefully when the client has no phone. If you
   intended the link to open a chat to the PLATFORM number instead, say so and I'll flip it.
2. **Consolidation**: the bell now reads `notifications`; the old occasion-`reminders` table +
   `/api/reminders` still exist (the cron still writes reminders for the email path). 6a did NOT
   remove them (no true drops). Confirm whether 6b should retire the reminders bell path fully.
3. **Prefs UI deferred**: prefs are settable via `PATCH /api/notifications/prefs` and honored by
   the engine, but the visual toggle UI is deferred to a follow-on (stated, not built).

## NOT built (6b): escalation ladder (half-lead/T-3), the gift-chosen signal / occasion_gift_state,
digests (per-user daily/weekly + platform digest wiring). Quote/order/payment triggers = P7/P8.
Foundation only. Holding.
