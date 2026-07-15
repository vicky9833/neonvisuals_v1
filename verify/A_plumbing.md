# STAGE A — PLUMBING (items 6-code, 3, 4, 5)

One build-green commit on `foundation`. Items 2 & 7 (the auth clamp + /admin→/ops
rename) are deliberately deferred to Stage B. tsc + `next build` both exit 0.

No new migrations in Stage A — the DB write policies (020), audit FK drop (021), and
audit INSERT policy (022) were applied in the prior (approved) step and are what item 6/3/8
build on. No `t20_` probe rows were created (the one audit row written is a real,
intended audit entry — see item 3).

---

## Item 6 — engines off the service-role client (user-context callers)

Per-site switch from `createAdminClient()` → request-scoped RLS client
(dynamically imported as `userDb()` so the server engines stay import-safe from client
components — see note at bottom).

| Engine | Change | Kept elevated (service role) + why |
|--------|--------|-------------------------------------|
| `quote.ts` | all 7 DB fns → `userDb()` | — |
| `order.ts` | all ~16 DB fns → `userDb()`; fulfilment writes to gift_records/employee_preferences rely on the `*_platform_write` policies (020) | — |
| `billing.ts` | invoice/payment CRUD + stats → `userDb()`; `getInvoice`/`recordPayment`/`recomputeOrderPaymentStatus` take an optional injected client | `handleRazorpayWebhook` (+ threaded helpers) — webhook has no user session |
| `lead.ts` | CRM reads/writes → `userDb()` | `captureLead` (PUBLIC, no session); `convertLeadToClient` (inserts a company — no authenticated companies INSERT policy) |
| `pdf.tsx` | `setQuotePdfUrl` write flows through quote.ts (user client) | storage upload stays elevated (no storage RLS in scope) |
| `memory.ts` | untouched — already on the RLS client | — |

Also KEPT ELEVATED (unchanged, justified): `/api/reminders/cron`, `/api/admin/team`,
`resolveCompanyRecipients` (cron). The stale "memory.ts violation" note in
`src/lib/supabase/server.ts` was corrected (item 6 explicitly).

**Client/server boundary fix:** switching engines to the request-scoped client pulled
`next/headers` toward client components that imported runtime constants from the engines.
Fixed by (a) importing the request client dynamically inside each engine (`userDb`), and
(b) extracting the pure runtime constants client components need into client-safe modules:
`order-constants.ts` (`ORDER_TRANSITIONS`, `ORDER_STATUS_FLOW`, `canTransition`) and
`lead-constants.ts` (`PIPELINE_STAGES`, `ACTIVE_LEAD_STATUSES`, `LOSS_REASONS`), re-exported
from the engines for server callers. Client components now import values from the
`-constants` modules and types via `import type`.

---

## Item 3 — super_admin cross-tenant override re-homed to the platform plane

The former `profile.role === "super_admin"` cross-tenant WHERE-clause override in the
billing/order/quote/invoice routes now flows through the platform-plane `authorize()` matrix
and emits an audit row. New helpers in `src/lib/api-auth.ts`:

- `requirePlatform(capability, meta)` — 401/403 + writes an audit row for auditable caps.
- `auditCrossTenantAccess(principal, capability, meta)` — used inside dual-plane GET routes:
  platform staff → `authorize()` (platform) + `writeAudit()`; tenant → own-company scope.

Former override sites now gated + audited:
`/api/orders` (GET list, POST), `/api/orders/[id]` (GET, PATCH), `/api/orders/stats`,
`/api/orders/[id]/recipients` (GET, POST), `/api/orders/[id]/status`,
`/api/orders/[id]/recipients/[recipientId]`, `/api/orders/from-quote`,
`/api/orders/[id]/employees`, `/api/invoices` (GET, POST), `/api/invoices/[id]` (GET, PATCH),
`/api/invoices/[id]/payments` (GET, POST), `/api/invoices/[id]/pdf`, `/api/invoices/stats`,
`/api/quotes` (GET, POST), `/api/quotes/[id]` (GET/PATCH/DELETE), `/api/quotes/[id]/send`,
`/api/quotes/[id]/pdf`.

Cross-tenant access is NO LONGER served by a service-role client that silently sees all
orgs — engines use the RLS client; platform staff see all orgs via `is_platform_staff()`
in the `_read` policies, and every such access is audited.

### REAL cross-tenant audit row (written through RLS, not service role)
Produced by `verify/scripts/audit-cross-tenant.mts` — authenticates as the platform owner
(`contact.neonvisuals@gmail.com`) via a genuine session, then inserts through the
`audit_log_insert_self` policy (`actor_user_id = auth.uid()`):
```json
{
  "id": 5,
  "actor_type": "platform",
  "action": "order.list",
  "entity": "order",
  "company_id": null,
  "created_at": "2026-07-15T09:40:09.338623+00:00"
}
```
(Full run log: `verify/3_audit_run.txt`.) This is the shape `auditCrossTenantAccess()`
emits when a platform user hits `GET /api/orders`.

---

## Item 4 — retire profiles.role reads (column NOT dropped)

- `src/lib/api-auth.ts`: rewritten around `getAuthContext()` (platform_staff + company_members).
  `requireApiRole` is now a **platform-staff shim that does NOT read profiles.role**;
  `requireApiAuth` returns membership-derived identity. No `profiles.role` read remains here.
- `src/lib/auth.ts`: dead `getRole()` and `requireRole()` (the only remaining
  profiles.role auth-decision readers) were **removed** — they had zero callers.

### Residual profiles.role reads — ALL are the Stage B surface (by design)
ripgrep `profile.role | .role === "super_admin" | select(... role ...)`:
- `proxy.ts` gate, `src/app/(admin)/layout.tsx` gate → Stage B item 2/7 (clamp + /ops rename).
- UI menu links: `components/{shared/mobile-nav, dashboard/Sidebar, dashboard/MobileSidebar,
  dashboard/UserMenu, auth/UserMenu, auth/ProtectedContent}` + `lib/use-auth-profile.ts`
  → Stage B item 7 (delete/relocate the "Admin Panel" link).
- `admin/team` (page + route): legacy management OF the deprecated `profiles.role` column
  (list + PATCH). Not an access-gate read; the column is dropped in Prompt 2b.
- The 3 known non-auth false-positives remain and are NOT profiles.role:
  `csv-parser.ts` (employee CSV job-title), `archetype.ts` (employee brief), marketing
  testimonial `t.role`.

The data/route/engine/auth-helper layer is clean of `profiles.role` auth reads.

---

## Item 5 — onboarding writes company_members + read-path cutover

- `src/app/(auth)/onboarding/actions.ts`: now inserts a `company_members` row
  (`role: org_owner, status: active`) and sets `companies.owner_id`. profiles.company_id is
  retained ONLY for the getProfile() company-display join; it is documented as non-scoping.
- All tenant-scoping READS now key on `company_members`: `requireApiAuth()` derives
  `company_id` from active memberships (`getAuthContext().activeCompanyId`), so every route
  using `profile.company_id` now keys on membership.
- `src/lib/services/recipients.ts`: replaced its `profiles.company_id` lookup with a
  `company_members` (active) → `profiles.email` resolution.

### ripgrep proving no tenant-scoping read keys on profiles.company_id
```
rg 'from\("profiles"\) ... company_id'  →  NO MATCHES
```
(The only `profiles` selects that remain read `id`/`email`/`role` by `id`, or `*, company:companies(*)`
for profile+company DISPLAY — none filter tenant resources by `profiles.company_id`.)

### Orphan user lands in onboarding
`mauryashivam7080@gmail.com` has zero `company_members` rows → `requireApiAuth().company_id`
is null and `getAuthContext().activeCompanyId` is null. Tenant API routes return empty and
the onboarding flow creates their first membership. (The proxy-level redirect to
`/onboarding` for the zero-membership case is wired in Stage B item 2.)

---

## Verification
- `npx tsc --noEmit` → exit 0
- `npm run build` → exit 0 (`✓ Compiled successfully`)
- No `t20_` probe rows created; the single audit row (id 5) is a real, intended entry.

## New files
`src/lib/authz/{matrix.ts,matrix.test.ts,context.ts(updated),audit.ts}`,
`src/lib/engines/{order-constants.ts,lead-constants.ts}`,
`supabase/migrations/019–022` (applied previously),
`verify/{1_matrix.md,9_trim.md,A_plumbing.md,3_audit_run.txt,scripts/audit-cross-tenant.mts}`.
