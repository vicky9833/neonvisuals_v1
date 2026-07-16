# Prompt 3a — Summary (DPA-gated onboarding + invite lifecycle, RLS/RPC-enforced self-join)

Branch `foundation`. Additive/expand only — no drops. Item-3 mechanism = **Option 2**
(`SECURITY DEFINER accept_invite(raw_token)` under the invitee's own JWT; never service-role).

## Items
| # | item | artifact | result |
|---|------|----------|--------|
| 1 | DPA consent at org creation (versioned const, 4 dpa_* columns, refuse w/o consent, wizard step) | `1_dpa.md` | ✅ all four dpa_* written (dpa_ip present); refusal enforced pre-insert |
| 2 | Invite creation (owner/admin, token_hash only, +7d, pending; RLS-gated) | `2_invite_create.md` | ✅ owner ALLOWED, outsider DENIED (RLS); raw token only in link |
| 3 | accept_invite RPC — token-scoped self-join, atomic single-use (a–g) | `3_invite_accept.md` | ✅ a–g all pass at the user-JWT layer |
| 4 | Email events (member_invite, member_joined) via Resend + email_log; no notifications table | `4_email.md` | ✅ real Resend ids + `sent` email_log rows |
| 5 | Type-lie cleanup (remove Profile.role / Role) | `5_types.md` | ✅ tsc clean |

## Migrations / new files
- `supabase/migrations/028_prompt3a_accept_invite.sql` — the SECURITY DEFINER RPC (applied to shared DB).
- `src/lib/authz/dpa.ts`, `src/lib/invites.ts` (token gen/hash), `src/app/api/team/invites/route.ts`,
  `src/app/(auth)/invite/accept/{page.tsx,AcceptInviteClient.tsx,actions.ts}`.
- Edits: onboarding `actions.ts` (DPA), `OnboardingWizard.tsx` (DPA step), `auth-types.ts`
  (dpaAccepted; remove role), `allowlist.ts` (`authed` class + `/invite`), `email.ts` +
  `email-templates.ts` (2 senders/templates), `types/database.ts` (accept_invite fn typing).

## tsc + build
- `npx tsc --noEmit` → **Finished TypeScript in 29.9s, no errors** (exit 0).
- `npm run build` → **GREEN** — 410 pages, `ƒ /api/team/invites` and `ƒ /invite/accept`
  registered, `ƒ Proxy (Middleware)` present, no errors.

## Residue
Every `t3a_` user / invite / member / company / email_log row deleted in-run; proven zero:
`companies(t3a_)=0, invites=0, members=0, auth_users(t3a_)=0, email_log(t3a)=0`.

## Points I STOPPED for a decision (item 3) — resolved by your ruling
- Token-hash cannot live in a `company_members` RLS `WITH CHECK` (raw token isn't a column;
  no per-request param into RLS). You ruled **Option 2** (SECURITY DEFINER RPC under the
  invitee JWT). Built exactly to the a–e hard requirements (identity derived, token-in-DB,
  atomic row-count guard, authenticated-only grant, defense-in-depth policy untouched).

## New realities discovered (not in recon; flagged, no scope change)
- `invites` has `UNIQUE (company_id, lower(email)) WHERE status='pending'`
  (`one_pending_invite_per_email`) and `UNIQUE (token_hash)` — good guards the create route inherits.
- Proxy's `?redirect=<path>` drops the query string, so an **unauthenticated** invite link
  (`/invite/accept?token=…`) loses its token through the login bounce. Mitigation shipped: the
  accept page itself builds `/login?redirect=/invite/accept?token=…` (and `/register?…`) links so
  the token survives when the user signs in from the page. The common path (invitee already
  signed in) is unaffected. Full proxy-level query preservation left as a UX item (not 3a scope).
- Email item 4 was verified by exercising the exact template functions + Resend + email_log
  write (mirroring the senders); `email.ts` couldn't be imported under tsx (server-only + `@/`).

## Out of scope (per prompt) — NOT built
/dashboard/team, role editor, remove-member, owner-transfer → Prompt 3b.

**STOP — one build-green change ready on `foundation`. Holding for your promote call. Never main.**
