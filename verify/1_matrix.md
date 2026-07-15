# Item 1 — Two-Plane Permission Matrix (COMPLETE)

Single source of truth encoded verbatim from the authoritative §6A/§6B supplement.

## Files
- `src/lib/authz/matrix.ts` — PURE (no server-only): role types (`CompanyRole`,
  `PlatformRole`), capability unions, `TENANT_MATRIX`, `PLATFORM_MATRIX`, the
  `authorize(principal, capability, resourceCtx) → Decision` pure function, and the
  three conditional classes (`own-dept`, `at-most-limit`, `shipping-only`).
- `src/lib/authz/context.ts` — server-only. `getAuthContext()` (reads platform_staff +
  company_members via the RLS cookie client), `platformPrincipal`/`tenantPrincipal`
  builders, and `authorizePlatform`/`authorizeTenant` convenience resolvers.
- `src/lib/authz/matrix.test.ts` — exhaustive Vitest.
- `supabase/migrations/019_employees_department_id.sql` — additive nullable FK column
  so `own-dept` binds to a real column (no backfill, no text-column drop → that's 2b).

## Decision type (not plain booleans)
```ts
interface Decision {
  effect: "allow" | "deny";
  reason?: string;
  audit: boolean;                    // ALLOW must be written to audit_log (items 3/8)
  conditional?: "own-dept" | "at-most-limit" | "shipping-only";
  allowedFields?: readonly string[]; // shipping-only ALLOW field allowlist
}
```

## Vitest result
```
 ✓ src/lib/authz/matrix.test.ts (166 tests) 22ms
 Test Files  1 passed (1)
      Tests  166 passed (166)
```
Raw verbose per-case log: `verify/_1_vitest_raw.txt` (one line per role×capability).

### Coverage
- **TENANT PLANE (§6A):** 15 capabilities × 6 roles = **90 cases**, each asserted against
  the matrix cell (Y→allow, N→deny, own-dept/limit→allow under passing ctx).
- **PLATFORM PLANE (§6B):** 11 capabilities × 5 roles = **55 cases**, same assertion.
- **Conditional classes — pass AND fail resourceCtx for each:**
  - `own-dept`: PASS (resource in dept) · FAIL (other dept) · FAIL (no dept) · FAIL (no ctx).
  - `at-most-limit`: PASS (at limit) · PASS (below) · FAIL (over) · FAIL (NULL limit) ·
    owner/admin/finance unlimited bypass.
  - `shipping-only`: PASS (shipping fields) · PASS (no explicit request → allowlist) ·
    FAIL (dob/phone requested).
- **§6A HARD RULE:** explicit denies for finance / manager / viewer on `employees.view_pii`.
- **Plane isolation:** tenant principal → platform capability = deny (`wrong-plane`);
  platform principal → tenant capability = deny. This is the default-deny backbone item 2 builds on.
- **Audit obligation:** cross-tenant (orders/billing/orgs/pii) + impersonation → `audit:true`;
  non-cross-tenant platform caps → `audit:false`.

## Verbatim encoding notes
- Tenant `quote.approve`: hr=`limit`, finance=`Y` (unlimited), manager=`limit`,
  owner/admin=`Y`. NULL `approval_limit` → DENY; owner/admin/finance bypass the compare.
- Platform `pii.read`: owner/admin=`Y` (Y*, audited full PII), ops=`shipping-only`
  (app-layer field allowlist {delivery_address, city, pincode}), finance/support=`N`.
- Platform `impersonate`: owner/admin/support=`Y` (Y*, audited); ops/finance=`N`.
  `// TODO(P3)` left in code for the banner/expiry/email UX (not faked here).

## ⚠️ Flagged (as instructed, not fixed)
- **shipping-only view inconsistency:** the app-layer allowlist is {delivery_address,
  city, pincode}, but the DB `employees_safe` view *omits* `delivery_address` while
  *exposing* city/pincode. Not reconciled here — `employees_safe` changes are Prompt 2b.
- `employees.department_id` is added but **not backfilled** from the text `department`
  column; managers' own-dept checks against employees will only resolve once departments
  and `employees.department_id` are populated (Prompt 2b backfill).

## tsc
`npx tsc --noEmit` → exit 0 (clean).
