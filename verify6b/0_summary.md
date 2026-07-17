# Prompt 6b — Escalation ladder + occasion_gift_state + digests — SUMMARY

Additive/expand; no true drops. foundation only; hold for promote. Builds on 6a (ca39a1a, live).

## Build health (final committed tree)
- `npx tsc --noEmit` → **exit 0**
- `npm run build` (Next 16 / Turbopack) → **GREEN**

## The two gates — PASSED
- **Escalation FIRES-when-no-gift and SUPPRESSES-when-gift-chosen (item 2) — PASSED.** No gift →
  stage 2 (half-lead) + stage 3 (T-3) fire to the correct §7 audiences; a synthetic gift-state row
  → both stages SUPPRESSED. Per-stage dedupe makes the scan idempotent.
- **gift-state SURVIVES occasion regeneration (item 1) — PASSED.** `giftChosenFor()` reads a stable
  key (NOT the ephemeral occasions.id); regenerating the occasion (new id, same identity) still
  returns true.

## Per-item pointers
| Item | Artifact | Result |
|------|----------|--------|
| 1 occasion_gift_state (regen-surviving) | `1_gift_state.md` (`1_gift_state_run.txt`) | **PASS** — survives regen; stable-key unique |
| 2 3-stage escalation | `2_escalation.md` (`2_escalation_run.txt`) | **PASS** — fire/suppress/dedupe/audiences/PII-safe |
| 3 digests | `3_digests.md` (`3_digests_run.txt`) | **PASS** — platform in-app aggregate + per-user rollup |
| 4 escalation/digest cron | `4_cron.md` (`4_cron_run.txt`) | **PASS** — idempotent 2nd run; wired to cron |

## Migration
- `041_occasion_gift_state` — side table keyed on a single `stable_key TEXT UNIQUE` (regen-safe),
  + company_id/employee_id/occasion_type_key/occasion_date, status, gift_chosen_at, chosen_by,
  quote_id/order_id (nullable; P7 fills). RLS: members+platform read, owner/admin/hr+service write.

## Code (additive, `src/lib/engines/notifications.ts` + cron)
- `stableOccasionKey()` — one source of truth for the stable identity (used by gift-state,
  notification dedupe, per-stage escalation dedupe). Refactored 6a's occasion helper to use it.
- `giftChosenFor(occasion)` — the §7 signal (reads occasion_gift_state by stable key).
- `runOccasionEscalation(occasion, company, today)` — stages 2/3, gift-state suppression, per-stage
  dedupe, tenant/platform split (PII-safe), reads occasion.lead_days + occasion_type_key.
- `runPlatformDigest()` — in-app daily aggregate to platform_admin (counts+types, PII-safe, per-day
  dedupe). `runUserDigests(daily|weekly)` — per-user rollup; `notify()` now DEFERS email when
  `digest_frequency != immediate`. `notify().audience` made optional (recipients-only sends).
- Cron: escalation scan (per company, upcoming occasions) + platform digest + daily user digests
  (weekly on Mondays), all idempotent.

## STOP-for-decision — stable-key uniqueness (resolved, flagging)
`(company, employee_id, type, date)` is UNIQUE for EMPLOYEE occasions (one birthday/anniversary/
onboarding per employee per date). But **company-WIDE festival/custom occasions can share a date**
(two festivals on one day) → collision. Resolution: `stableOccasionKey` appends the occasion
`title` (festival/custom name — NOT employee PII) for the company-wide case, and gift-state stores
a single `stable_key TEXT UNIQUE` (NULL-safe, unlike a multi-column unique with nullable
employee_id). Proven in `1_gift_state.md` (same-date festivals → distinct keys; employee key is
uuid-only, no PII). **This also fixes a latent 6a dedupe collision for same-date company-wide
occasions** (the refactor routes 6a through the same helper). Flagging in case you want a
first-class `festival_id`/`custom_occasion_id` on occasions instead of title-in-key (a P7+ schema
choice).

## PII-safety (§10.13)
New escalation sends are PII-safe: titles reference-style (occasion TYPE, no name); employee name
only in RLS-gated tenant bodies; platform escalation/digest bodies + wa.me links carry org/
business-contact context only. Adversarially checked in `2_escalation.md` (zero sentinels in
titles/links; platform bodies PII-free).

## Residue
Zero. All t6b_ fixtures swept; occasion_gift_state cleared; the platform_digest row written to the
real founder (company_id NULL — does not cascade) explicitly deleted by `platdigest:{today}` key;
org_owner members + companies via MCP disable-trigger; users via `_cleanup_users.mjs`. Final (MCP):
notifications=0, notification_prefs=0, occasion_gift_state=0, t6b companies/email=0,
platform_staff=1 (founder untouched), t6b users=0.

## NOT built (P7): the REAL gift-chosen write (quote->order writes occasion_gift_state) +
occasion-linked quotes. 6b proves the escalation MECHANISM via synthetic gift-state. Foundation
only. Holding.
