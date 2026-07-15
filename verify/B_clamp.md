# STAGE B — THE AUTH CLAMP (items 2 + 7)

Separate build-green commit on `foundation`. tsc exit 0 · `next build` exit 0 ·
199 authz tests pass · no `t20_` rows created.

---

## Item 7 — /admin → /ops rename + link/URL fixes

- **Route tree renamed** (filesystem, history preserved where possible):
  - Pages: `src/app/(admin)/admin/*` → `src/app/(admin)/ops/*`  → URLs `/ops/*`
    (the `(admin)` route *group* folder is cosmetic and unchanged — parens don't affect URLs).
  - API: `src/app/api/admin/*` → `src/app/api/ops/*`.
- **Leaked "Admin Panel" link deleted** (`auth/UserMenu.tsx`) — and the equivalent
  role-gated links in `dashboard/UserMenu.tsx` and `shared/mobile-nav.tsx` were removed too.
  The real gate is the proxy's default-deny on `/ops` (item 2).
- **Legacy `/admin` → `/ops` redirect** in `proxy.ts` (covers links in already-sent emails):
  `if (pathname === "/admin" || startsWith("/admin/")) → 301 /ops + rest`.
- **Email CTA fixed** (`src/lib/services/email-templates.ts`):
  - line ~268: `ctaUrl: \`${APP_URL}/ops/leads\`` (was `/admin/leads`)
  - line ~311: `ctaUrl: params.whatsappUrl ?? \`${APP_URL}/ops/leads\`` (was `/admin/leads`)
  - (also the occasion-reminder "Open Admin" CTA → `${APP_URL}/ops`)
- **`/ops/vendors` DISABLED**: dead page deleted + explicit `denied` allowlist entry →
  403 for everyone (project.md: no vendor management; §6B has no vendor capability).

### ripgrep — zero stale /admin URL refs except the redirect
```
src/**  URL-literal /admin refs   → 0   (0 page refs, 0 /api/admin refs)
proxy.ts                          → the intentional /admin→/ops redirect literals ONLY
@/components/admin + @/lib/admin import paths → 27, INTACT (not corrupted)
```

---

## Item 2 — default-deny authorize() on every route AND page

- **`src/lib/authz/allowlist.ts`** — the SINGLE explicit allowlist. `pageAccessFor(path)`
  returns the access class or `null` (⇒ default-deny). `resolvePageDecision(access, state)`
  is a PURE, unit-tested function returning `pass | deny(403) | redirect`.
- **`proxy.ts`** (middleware) — resolves the caller's planes from `platform_staff` +
  `company_members` (NOT profiles.role), then applies `resolvePageDecision`. API routes
  self-enforce (Stage A) and pass through; public/metadata routes excluded via matcher.
- **Layout wrappers (defense-in-depth):** `(admin)/ops` layout re-checks
  `getAuthContext().isPlatformStaff`; dashboard shell unchanged (proxy gates membership).

### THE FULL ALLOWLIST (ordered; first match wins; unmatched ⇒ default-deny 403)
| # | path | match | access |
|---|------|-------|--------|
| 1 | `/ops/vendors` | prefix | **denied** (403) |
| 2 | `/ops` | prefix | **platform** |
| 3 | `/dashboard` | prefix | **tenant** |
| 4 | `/onboarding` | exact | onboarding |
| 5 | `/login` | exact | auth |
| 6 | `/register` | exact | auth |
| 7 | `/forgot-password` | exact | auth |
| 8 | `/verify` | exact | auth |
| 9 | `/auth` | prefix | public (OAuth/email callback) |
| 10 | `/` | exact | public |
| 11-24 | `/about`,`/blog`,`/collections`,`/contact`,`/faq`,`/get-quote`,`/get-started`,`/gift-builder`,`/how-it-works`,`/occasions`,`/pricing`,`/privacy`,`/products`,`/terms` | prefix | public |
| 25 | `/payment-status` | prefix | public |
| — | anything else | — | **null ⇒ default-deny 403** |

### Tenant plane — THREE outcomes (proven)
- allow (member on /dashboard) · deny 403 (tenant user on /ops) · no-membership → /onboarding.

### Acceptance proofs (from `src/lib/authz/clamp.test.ts`, verbose log: `verify/B_clamp_vitest.txt`)

**Tenant user hitting an /ops route → 403 body:**
```
resolvePageDecision(pageAccessFor("/ops"), {authenticated:true, isPlatform:false, hasMembership:true})
=> { type: "deny", status: 403, body: "Forbidden — platform access required" }
```

**Orphan user (authenticated, zero memberships) → onboarding redirect:**
```
resolvePageDecision(pageAccessFor("/dashboard"), {authenticated:true, isPlatform:false, hasMembership:false})
=> { type: "redirect", to: "/onboarding" }
```
(This is the exact case of `mauryashivam7080@gmail.com`: 0 company_members rows → NEW USER → onboarding, not locked out.)

**A route deliberately left OFF the allowlist default-denies:**
```
pageAccessFor("/secret-unlisted") => null
resolvePageDecision(null, …)      => { type: "deny", status: 403, body: "Forbidden — route not on allowlist" }
```

### LOAD-BEARING — tenant `viewer` WRITE → 403 from authorize()
Migration 020 made money-table write RLS tenant-isolation-only (ANY member can write at the
DB layer); `authorize()` is therefore the SOLE role gate. A `viewer` is denied every write:
```
authorize({plane:"tenant", role:"viewer"}, "quote.request")  => { effect:"deny", reason:"tenant role 'viewer' denied 'quote.request'" }
authorize(viewer, "quote.approve")                           => { effect:"deny" }
authorize(viewer, "billing.manage")                          => { effect:"deny" }   // invoice writes
```
The 403 the route emits (requireTenant → ApiAuthError(403,"forbidden") → apiAuthErrorResponse):
```json
{ "error": "forbidden", "message": "tenant role 'viewer' denied 'quote.request'" }
```
(Additionally, the money-WRITE API routes are platform-gated via `requirePlatform`, so a
tenant `viewer` is already denied at the plane boundary — belt AND braces.)

---

## Item 4 COMPLETION — profiles.role fully retired from AUTH reads
Converted the residual readers to the two-plane model:
- `proxy.ts` → platform_staff + company_members.
- `(admin)/ops` layout → `getAuthContext().isPlatformStaff`.
- `use-auth-profile.ts` → drops `role`, adds `isPlatformStaff` (from platform_staff).
- UI menu links removed (auth/dashboard UserMenu, mobile-nav); `Sidebar` role filtering
  dropped; `ProtectedContent` no longer role-aware.
- `ops/team` page + `/api/ops/team` route + `TeamList` → operate on **platform_staff**
  (owner-gated via `platform.staff.manage`), not profiles.role.

### ripgrep — zero remaining profiles.role AUTH reads
```
profile.role | .role === "super_admin" | profiles-select(role).eq(id) → 0 matches
```
Non-auth false-positives that remain (NOT profiles.role): `csv-parser.ts` employee CSV
job-title, `archetype.ts` employee brief, marketing testimonial `t.role`, and comments
mentioning `owner/admin`/`org_admin`. The `profiles.role` COLUMN is retained (dropping it
is Prompt 2b).

---

## Verification
- `npx tsc --noEmit` → exit 0
- `npm run build` → exit 0 (`✓ Compiled successfully`)
- `npx vitest run src/lib/authz/` → 199 passed (matrix 166 + clamp 33)
- No `t20_` probe rows created in Stage B.

## DEBT LOGGED (not this stage)
`requireApiRole` is still a **platform-staff shim** used by ~25 platform admin routes
(blog, catalog, settings, analytics, leads CRM, pricing). It does NOT read profiles.role,
but it is NOT a real per-capability `authorize()` call. Retire it when those routes get
explicit §6B capability checks (Prompt 3).
