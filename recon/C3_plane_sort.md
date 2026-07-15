# C3 — PLANE-SORT CENSUS (lockout-critical)

All counts are live reads from project `xserhblhiwtmaiejbvgo` (matches `.env.local`).

## Row counts
| Metric | Count |
|--------|-------|
| `auth.users` | **2** |
| `public.profiles` | **2** |
| `platform_staff` (exists ✅) rows | **1** |
| `company_members` (exists ✅) rows | **0** |
| `departments` (exists ✅) rows | **0** |

## `profiles.role` distribution
| role | count |
|------|-------|
| `super_admin` | 1 |
| `client` | 1 |

## The two users (identity resolves the super_admin question from data — no guess)
| user | email | profiles.role | company_id | in platform_staff | platform_role | company_members |
|------|-------|---------------|------------|-------------------|---------------|-----------------|
| A | contact.neonvisuals@gmail.com | super_admin | null | **YES** | **owner** | 0 |
| B | mauryashivam7080@gmail.com | client | null | no | – | 0 |

**super_admin classification:** User A is `contact.neonvisuals@gmail.com` — the official
Neon Visuals contact address (per `project.md`) AND already seeded into `platform_staff`
as `owner`. This is a **Neon Visuals staffer**, not a tenant user. Determinable from data;
no decision needed for this user.

## Membership / orphan analysis
- Profiles with a matching `company_members` row: **0**
- **Orphaned profiles (no membership AND not platform staff): 1** → User B (the `client`).

### ⚠️ LOCKOUT RISK (STOP-for-decision item)
When Prompt 2 drops `profiles.role` and moves tenant gating to `company_members`,
**User B (`mauryashivam7080@gmail.com`) has zero memberships and no company_id**, so
it would be locked out of `/dashboard` entirely. Options (need your call):
1. Backfill a `company_members` row for User B — but there is **no company_id** on the
   profile and `company_members` has 0 rows, so we'd also need to know **which company**
   (and whether a `companies` row even exists for them).
2. Treat User B as a test account and leave it orphaned (accept lockout).
3. Something else.
**I will not guess — flagged for your decision.**

## How `/ops` and `/admin` are gated today
- **There is NO `/ops` route yet** (`file_search app/ops` → none). The platform plane is
  currently `/admin`.
- **proxy.ts** (root, Next.js 16 `proxy` convention) gates:
  - `/admin/*` → `if (isAdmin && role !== "super_admin") redirect("/dashboard")` (proxy.ts ~line 63).
    The `role` is read from the profile earlier in proxy.ts.
  - `/dashboard/*` → authenticated + onboarded.
- **src/app/(admin)/layout.tsx line 24** → `if (profileWithCompany.role !== "super_admin") redirect("/dashboard")` (belt-and-braces server guard).
- **API:** `/api/admin/team` uses `requireApiRole(["super_admin"])`.

## Where the "Admin Panel" dropdown link renders (and its condition)
- **src/components/auth/UserMenu.tsx line 72** → `{profile.role === "super_admin" ? (<Link href="/admin">…)`
- Also in **src/components/dashboard/UserMenu.tsx line 83** and **src/components/shared/mobile-nav.tsx line 131**, same `profile.role === "super_admin"` condition, all linking to `/admin`.

## Headline
Prompt-1 tables (`platform_staff`, `company_members`, `departments`) exist but only
`platform_staff` is populated (1 owner = the NV staffer). `company_members` is **empty**,
so the single tenant user (`client`) is **orphaned and will be locked out** the moment
tenant auth moves off `profiles.role`. That backfill decision is the #1 gate before Prompt 2.
