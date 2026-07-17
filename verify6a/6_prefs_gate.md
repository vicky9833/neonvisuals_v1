# Item 6 — Plan gating + prefs UI — PASS (nothing new gated; UI deferred)

## Plan gating
- 6a wires the CORE notification engine + in-app bell + occasion/membership triggers. These are
  baseline product function (occasion reminders, team updates) — NOT Pro-gated. Nothing in 6a is
  plan-gated, so `plan-gate.ts` is UNCHANGED.
- The Pro-gated candidates (per-user daily/weekly DIGESTS, escalation) are **6b** — a
  `free_digests_blocked`-style reason + `canUseDigests()` helper will be added there if the digest
  feature is Pro (decision deferred to 6b). Stated here so the seam is explicit.

## Prefs honored + UI
- `notification_prefs` is honored by the engine (proven in item 2: email suppressed for a user
  with `email=false`; default when no row). Reads/writes are user-scoped via
  `GET/PATCH /api/notifications/prefs` (RLS `notification_prefs_own`; user_id from the session,
  never the body).
- The VISUAL prefs toggle UI is **deferred** to a follow-on (stated, not built). The endpoint makes
  prefs settable now; the engine reads the table directly, so preferences are already effective.
