# 3b Item 2 — Self-demote (DB-enforced)

The last-owner trigger is row-level and neutral about who initiated the change, so a sole owner
acting on their OWN row is blocked identically.

## Evidence (real JWT sessions) — from `_guards_test_run.txt`
```
sole owner self-demote  -> DENIED ✓ (LAST_OWNER)
non-owner (admin) self-demote to viewer -> ALLOWED ✓ [{"role":"viewer"}]
(a 'non-sole owner' cannot exist under one_org_owner_per_company — noted)
```
- **Sole owner demotes self → DENIED** (same guard, via the owner's own JWT / RLS `company_members_manage`).
- The original "non-sole owner demotes self → ALLOWED" case is **structurally impossible** (a
  company can never have two active owners). Instead we prove the guard is **owner-specific**: a
  non-owner (`org_admin`) self-demoting to `viewer` is **ALLOWED** — the guard does not over-block
  ordinary self-service role changes; it only protects the sole owner seat.
