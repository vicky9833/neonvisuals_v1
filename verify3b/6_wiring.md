# 3b Item 6 — Types + allowlist

## Allowlist
`/dashboard/team` is classed **tenant** by the existing prefix rule
`{ path: "/dashboard", access: "tenant" }` in `src/lib/authz/allowlist.ts` (`pageAccessFor`
matches `/dashboard` and any `/dashboard/*`). No new entry required — the page inherits the tenant
gate (proxy: authenticated + active membership, else → /onboarding or /login). Confirmed by the
build registering `ƒ /dashboard/team` (dynamic, proxy-gated).

## Types
`src/lib/types/database.ts` Functions extended so `supabase.rpc(...)` is typed:
```
accept_invite:      { Args: { raw_token: string };      Returns: string }
transfer_ownership: { Args: { target_user_id: string }; Returns: string }
```

## New routes registered (build manifest)
- `ƒ /dashboard/team`
- `ƒ /api/team/members/[userId]`
- `ƒ /api/team/transfer`
(plus existing `ƒ /api/team/invites` from 3a). `/ops/team` unchanged.

## tsc + build
- `npx tsc --noEmit` → exit 0 (clean).
- `npm run build` → GREEN — 412 pages, `ƒ Proxy (Middleware)` registered, no errors.
