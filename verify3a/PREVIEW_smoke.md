# Prompt 3a — Foundation Preview Smoke

**Preview:** `https://neonvisuals-v1-iou9-git-foundation-vicky9833s-projects.vercel.app`
**Deployed SHA (behavioural):** `303e091` — confirmed via two liveness flips on the branch alias:
1. `/invite/accept` (logged-out, bypass) went **403 → 307 /login** (new `authed` allowlist entry
   is live — 92d6eeb+).
2. the `/login` redirect Location went `…redirect=%2Finvite%2Faccept` → **`…redirect=%2Finvite%2Faccept%3Ftoken%3D…`** (the proxy token-survival fix — 303e091).

> Note: 3a's app code changed, so `/admin`→307 alone can't date the commit; the two flips above
> uniquely pin 303e091.

## 2. Proxy redirect / token-survival (the deployment-specific one) — ✅ PASS
Logged-out GET `/invite/accept?token=probe123` (bypass token, no Supabase session):
```
307  loc='/login?redirect=%2Finvite%2Faccept%3Ftoken%3Dprobe123'
```
The real middleware now preserves the **full query string** in `?redirect=` → the token survives
the login bounce. `LoginForm` reads `?redirect` and `router.replace()`s back to
`/invite/accept?token=probe123`, where (now authenticated) the invitee can accept.
**Fix shipped this phase:** `src/proxy.ts` now sets `redirect = pathname + request.nextUrl.search`
(was `pathname` only). No-query routes (e.g. `/dashboard`) are unchanged → prior smoke holds.

## 1. Invite lifecycle end-to-end (deployed) — ✅ PASS
- **Create via deployed `/api/team/invites`** (owner authenticated with a real Supabase SSR cookie,
  bypass token): `201` →
  `{"data":{"id":"5ddbd802-…","acceptUrl":"https://neonvisuals.in/invite/accept?token=6CiUvnYD…"}}`.
  Invite row: `role=viewer, status=pending, expires_at=+7d`, `token_hash == sha256(raw)` **true**,
  raw token only in the returned link. (RLS `invites_manage` + `members.invite` gate ran on deployed code.)
- **Accept under the invitee's session** (RPC `accept_invite` via the invitee's bearer JWT on the
  same shared DB the preview uses — identical to what the deployed accept action calls):
  - membership row: `{"company_id":"a66e8236-…","user_id":"683a2eb8-…","role":"viewer","status":"active","invited_by":"9efd98ea-…"}`
  - invite row: `{"status":"accepted","accepted_at":"2026-07-16T07:16:21.98…"}`
- **Reuse same token → DENIED ✓.**

## 3. DPA gate (deployed shared DB) — ✅ PASS
Company row written with all four consent columns:
`{"dpa_accepted_at":"2026-07-16T07:16:15.87…","dpa_accepted_by":"9efd98ea-…","dpa_version":"2026-07-16.v1","dpa_ip":"203.0.113.9"}`.
(Refusal-without-consent is enforced in the onboarding server action before any insert — code gate,
verified locally in `1_dpa.md`.)

## 4. Public surface unbroken — ✅ PASS
| method · path | status |
|---|---|
| GET `/` | 200 |
| GET `/products` | 200 |
| GET `/login` | 200 |
| GET `/register` | 200 |
| GET `/dashboard` | 307 → `/login?redirect=%2Fdashboard` |
| GET `/nonexistent-xyz` | **403** (allowlist body — default-deny intact) |
| POST `/api/leads/capture` | 200 `{success:true}` |
| POST `/api/contact` | 200 `{received:true}` |

No regression from the new `authed` class / `/invite` entry.

## Residue
`companies(t3a_)=0, auth_users(t3a_)=0, leads(t3a_)=0` — all test rows cleaned up.

## Method notes (honest)
- The invite **create** was driven through the deployed route handler using a forged `@supabase/ssr`
  cookie (`sb-<ref>-auth-token`, base64 session) → it authenticated and returned 201, so the deployed
  cookie-auth + RLS path is genuinely exercised.
- The **accept** was invoked via the `accept_invite` RPC under the invitee's bearer JWT (the deployed
  `/invite/accept` server action makes the identical `supabase.rpc('accept_invite')` call under the
  cookie session; server actions aren't drivable via a headless HTTP script, so the RPC was called
  directly against the same shared DB). Item 2 above independently proves the page's proxy path.

**Verdict:** all four checks green on the deployed preview; token survives the real login bounce
(the fix), invite lifecycle works end-to-end, public surface intact, zero residue.
**STOP — holding for your promote call. Never main.**
