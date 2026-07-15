# Item 1 — Two-Plane Permission Matrix — **DRAFT FOR APPROVAL**

> ⚠️ **NOT YET IMPLEMENTED.** No routes, pages, or `authz/context.ts` have been changed.
> This is the proposed single-source-of-truth matrix. The referenced spec §6A/§6B does
> not exist in the repo, so:
> - **Tenant plane (§6A)** rows marked ✅RLS are grounded in the live `employees` RLS
>   policies (recon C4) — DB and app will agree.
> - Rows marked **[ASSUMED]** are my proposal, not sourced from any spec. **Please edit.**
> - **Platform plane (§6B)** is entirely **[ASSUMED]** (no source exists beyond role names
>   + the "ops = shipping-only PII" hint in the prompt).

## Roles

- **Tenant** (`company_role`): `org_owner`, `org_admin`, `hr`, `finance`, `manager`, `viewer`
- **Platform** (`platform_role`): `owner`, `admin`, `ops`, `finance`, `support`

## Outcome type (not plain booleans)

```ts
type Decision =
  | { effect: "allow" }
  | { effect: "deny"; reason: string }
  | { effect: "conditional"; class: "own-dept";      departmentId: string }   // manager scope
  | { effect: "conditional"; class: "at-most-limit"; limit: number }          // approval_limit vs amount
  | { effect: "conditional"; class: "shipping-only"; fields: readonly string[] }; // platform ops PII
```

`authorize(principal, capability, resourceCtx) -> Decision`. Pure function. The matrix is
the ONLY place role logic lives.

---

## TENANT PLANE (§6A) — capability × role

Legend: **A**=allow · **D**=deny · **own-dept**=conditional(own-dept) · **≤limit**=conditional(at-most-limit)

| Capability | org_owner | org_admin | hr | finance | manager | viewer | Source |
|---|---|---|---|---|---|---|---|
| `employees.read.pii` (dob/phone/delivery_address) | A | A | A | D | **own-dept** | D | ✅RLS |
| `employees.read.safe` (no-PII view) | A | A | A | A | A | A | ✅RLS |
| `employees.create` | A | A | A | D | D | D | ✅RLS |
| `employees.update` | A | A | A | D | D | D | ✅RLS |
| `employees.delete` | A | A | D | D | D | D | ✅RLS |
| `employees.bulk_upload` | A | A | A | D | D | D | [ASSUMED] |
| `gifts.read` (memory/gift history) | A | A | A | A | own-dept | A | [ASSUMED] |
| `gifts.write` (record gift/feedback) | A | A | A | D | own-dept | D | [ASSUMED] |
| `quotes.read` | A | A | A | A | A | A | [ASSUMED] |
| `quotes.create` | A | A | A | D | A | D | [ASSUMED] |
| `quotes.update` | A | A | A | D | own-dept | D | [ASSUMED] |
| `quotes.approve` | A | A | **≤limit** | D | **≤limit** | D | [ASSUMED] |
| `orders.read` | A | A | A | A | A | A | [ASSUMED] |
| `orders.create` (from quote) | A | A | A | D | A | D | [ASSUMED] |
| `orders.update_status` | A | A | A | D | D | D | [ASSUMED] |
| `invoices.read` / `billing.read` | A | A | A | A | D | D | [ASSUMED] |
| `invoices.record_payment` | A | A | D | A | D | D | [ASSUMED] |
| `occasions.read` / `reminders.read` | A | A | A | A | A | A | [ASSUMED] |
| `reminders.write` | A | A | A | D | own-dept | D | [ASSUMED] |
| `analytics.read` (dashboard) | A | A | A | A | own-dept | A | [ASSUMED] |
| `company_settings.read` | A | A | A | A | A | A | [ASSUMED] |
| `company_settings.update` | A | A | D | D | D | D | [ASSUMED] |
| `members.manage` (invite/assign roles) | A | A | D | D | D | D | [ASSUMED] |
| `support.create_ticket` | A | A | A | A | A | A | [ASSUMED] |

### Conditional classes on the tenant plane
- **own-dept** — `manager` is scoped to `company_members.department_id`; resourceCtx must
  carry the resource's `department_id` (or, for employees today, the `department` text →
  see §Open Q3). Matches the live `employees_read_full` RLS manager branch.
- **≤limit** — `quotes.approve` for `hr`/`manager` allowed only when
  `quote.total_amount <= company_members.approval_limit`. `org_owner`/`org_admin` = unlimited
  (A). If `approval_limit` is null → treat as 0 → deny (must be explicitly granted).

---

## PLATFORM PLANE (§6B) — capability × role  **(ALL [ASSUMED] — no source)**

| Capability | owner | admin | ops | finance | support |
|---|---|---|---|---|---|
| `platform.cross_tenant.read` (all orgs' quotes/orders/invoices) | A | A | A | A | A |
| `platform.orders.manage` (fulfilment/status any org) | A | A | A | D | D |
| `platform.quotes.manage` (any org) | A | A | A | D | D |
| `platform.billing.manage` (invoices/payments any org) | A | A | D | A | D |
| `platform.pii.read` (employee PII any org) | A | A | **shipping-only** | D | D |
| `platform.leads.read` (CRM) | A | A | A | A | A |
| `platform.leads.write` (CRM) | A | A | A | D | A |
| `platform.catalog.manage` (products/pricing) | A | A | A | D | D |
| `platform.collections.manage` | A | A | A | D | D |
| `platform.blog.manage` | A | A | D | D | D |
| `platform.emails.manage` | A | A | D | D | D |
| `platform.clients.manage` (companies) | A | A | A | A | A(read) |
| `platform.analytics.read` | A | A | A | A | A |
| `platform.staff.manage` (platform_staff/team) | A | A | D | D | D |

### Conditional class on the platform plane
- **shipping-only** — `ops` reading employee PII is limited to shipping fields.
  Proposed field set: `delivery_address`, `city`, `pincode`. **⚠️ Conflict to resolve:**
  the current `employees_safe` view *omits* `delivery_address` but *exposes* `city`/`pincode`.
  So "shipping-only" cannot be served by `employees_safe` as-is. Since altering
  `employees_safe` is **out of scope (Prompt 2b)**, for now `ops` shipping-only PII read
  will be enforced at the **app layer** (authorize() returns the allowed field set and the
  route projects to those fields). Flagged as Open Q2.

---

## Open questions I need you to confirm/correct before I implement

1. **Platform role decisions (entire §6B table).** The whole platform matrix is my
   assumption. In particular: should `ops` see full cross-tenant financials, or read-only?
   Should `support` be strictly read-only everywhere except leads? Please edit the table.

2. **`shipping-only` field set + enforcement.** Confirm fields = {delivery_address, city,
   pincode}, and that app-layer projection (not touching `employees_safe`) is acceptable
   for now given Prompt 2b defers the view change.

3. **`own-dept` for managers pre-`department_id`.** `employees.department_id` does not exist
   yet (recon C5); today it's text-match on `department` = `departments.name`. The matrix
   models own-dept via `company_members.department_id` → `departments.name`. OK to keep the
   text-name comparison until the FK backfill (also Prompt 2b)? Or add the nullable
   `department_id` column to `employees` now (additive/non-destructive, in scope)?

4. **`quotes.approve` ≤limit default.** Confirm: null `approval_limit` = deny (my proposal),
   and org_owner/org_admin are unlimited.

5. **Tenant [ASSUMED] rows.** Skim the tenant table — especially finance (can it read
   employees safe-view? create quotes? I have finance = billing-focused, no employee writes)
   and viewer (read-only everywhere). Correct anything that doesn't match your intent.

6. **`vendors` route exists** under `/admin/vendors`, but `project.md` says "No vendor
   management in the platform." Should `/ops/vendors` be dropped from the allowlist (deny
   for all), or kept? (Route deletion would be destructive to files — I'll just leave it
   off the allowlist so it default-denies unless you say otherwise.)

---

## Once approved
I will: encode this as the typed matrix in `authz/context.ts` (+ a new `authz/matrix.ts`),
write the pure `authorize()`, and produce `./verify/1_matrix.md` with Vitest exercising
**every role × every capability on both planes**, including pass+fail resourceCtx for
own-dept, ≤limit, and shipping-only. Then proceed to items 2→9 in order.
