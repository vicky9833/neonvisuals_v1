# Prompt 2 (EXPAND) — Evidence Summary (items 1–9)

Foundation branch. Two build-green commits: **Stage A (plumbing)** + **Stage B (clamp)**.
Non-destructive throughout (additive columns/policies, one constraint DROP that loosens).
Nothing reached `main`. HOLD for the promote call.

## Coupling / promotability
Migration 020 gave money tables tenant-isolation-only write RLS; the app-layer role gate is
**item 2 (Stage B)**. Stage A alone is therefore **unpromotable** — A+B promote together.
Both are now landed and green.

## Item-by-item
| Item | Artifact | Headline | Status |
|------|----------|----------|--------|
| 1 | `verify/1_matrix.md` | Typed two-plane matrix + pure `authorize()`; 166 tests over every role×capability + pass/fail for own-dept/≤limit/shipping-only. `employees.department_id` added (mig 019). | ✅ |
| 2 | `verify/B_clamp.md` | Default-deny allowlist + proxy + layout wrappers; 3 tenant outcomes; tenant→/ops 403; orphan→onboarding; off-allowlist 403; **viewer WRITE 403** proven. | ✅ |
| 3 | `verify/A_plumbing.md`, `verify/3_audit_run.txt` | super_admin cross-tenant override re-homed to platform `authorize()` + `audit_log` write (no service-role cross-tenant). REAL audit row id=5 pasted. | ✅ |
| 4 | `verify/A_plumbing.md` + `verify/B_clamp.md` | All `profiles.role` AUTH reads retired (data/route/engine/helper in A; proxy/layout/UI/use-auth-profile/team in B). Column kept (drop = 2b). ripgrep = 0. | ✅ |
| 5 | `verify/A_plumbing.md` | Onboarding writes `company_members(org_owner)`; tenant scoping keyed on membership; `recipients.ts` off profiles.company_id. ripgrep = 0 profiles.company_id scoping reads. | ✅ |
| 6 | `verify/A_plumbing.md`, `verify/6_service_role.md` | quote/order/billing/lead engines → request-scoped RLS client (dynamic `userDb`); webhook/cron/public-capture/company-insert kept elevated; memory.ts note corrected. | ✅ |
| 7 | `verify/B_clamp.md` | `/admin`→`/ops` (pages + API); leaked link deleted; legacy redirect; email CTAs fixed (lines ~268 & ~311); `/ops/vendors` disabled. ripgrep: 0 stale /admin except redirect. | ✅ |
| 8 | `verify/8_audit.md`, `verify/3_audit_run.txt` | `audit_log_company_id_fkey` dropped → plain uuid (forensics); append-only trigger intact (service-role UPDATE rejected: "audit_log is append-only"); real audit row written. | ✅ |
| 9 | `verify/9_trim.md` | `humaniseName` guarded against undefined/null; 6 tests. | ✅ |

## Migrations applied to hosted `xserhblhiwtmaiejbvgo` (free plan, no PITR) — all additive/loosening
- `019_employees_department_id.sql` — nullable FK column (own-dept).
- `020_tenant_write_policies.sql` — isolation-mirror write RLS on money/order tables + platform-staff fulfilment writes.
- `021_audit_log_company_fk_drop.sql` — DROP CONSTRAINT (loosen); append-only trigger untouched.
- `022_audit_log_insert_policy.sql` — self-attributed audit INSERT (actor_user_id = auth.uid()).

## Final verification (Stage B HEAD)
- `npx tsc --noEmit` → **exit 0**
- `npm run build` → **exit 0** (`✓ Compiled successfully`)
- `npx vitest run src/lib/authz/` → **199 passed**; `scripts/product-copy.test.ts` → 6 passed.
- **Zero `t20_` residue** — no probe rows were ever written; the single `audit_log` row (id 5)
  is a real, intended audit entry (append-only by design).

## Out of scope (Prompt 2b, gated on Supabase Pro upgrade) — NOT done, NOT assumed
Drop `profiles.role` column · alter/replace `employees_safe` · physical PII split ·
drop the 5 dead tables · unwire `quotes.kit_id` · backfill `employees.department_id` from
the text `department` column.

## Debt logged (Prompt 3 — do NOT assume complete)
1. **`requireApiRole` shim** on ~25 platform admin routes (blog, catalog, settings,
   analytics, leads CRM, pricing): gates on platform-staff membership (no profiles.role
   read) but is NOT yet a real per-capability `authorize()` call. Retire when those routes
   get explicit §6B capability checks.
2. **`components/admin/` + `lib/admin/` folders still named `admin`** while serving `/ops`
   (e.g. `AdminSidebar`, `AdminProvider`, `lib/admin/overview`). Cosmetic only — import
   paths, not URLs; the URLs are all `/ops`. Rename for clarity in P3.
3. **Matrix-ahead-of-route:** the tenant `quote.approve` (≤limit for hr/manager) capability
   exists in the matrix but has NO tenant write route today (quotes are platform-managed).
   A future tenant approve-quote route MUST call
   `requireTenant("quote.approve", companyId, { amount })` — the ≤limit conditional is
   already proven in the matrix suite.

Also still deferred: `shipping-only` PII for platform `ops` is enforced app-layer only (the
`employees_safe` city/pincode-vs-delivery_address inconsistency is accepted until 2b), and
the impersonation UX (banner/expiry/email) is `// TODO(P3)`.

## HOLD
Awaiting the promote call. Never main until then.
