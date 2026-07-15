# C1 — `profiles.role` READ SWEEP

Every file+line that READS `profiles.role` (or `role` off a `profiles` query / `Profile`
type). Ripgrep across `src/**/*.{ts,tsx}`. Classification key:

- **[tenant-auth]** — gates access to a company/tenant resource
- **[platform/super_admin-auth]** — gates access to the platform/admin plane
- **[display-only]** — only used to show/hide UI, no security decision
- **[other]** — not a `profiles.role` read (CSV/archetype/testimonial `role` fields)

| # | File | Line | Snippet | Classification |
|---|------|------|---------|----------------|
| 1 | src/lib/auth.ts | 49 | `return profile?.role ?? null;` (`getRole()`) | [platform/super_admin-auth] — feeds `requireRole` |
| 2 | src/lib/auth.ts | 74 | `if (!allowed.includes(profile.role)) redirect("/dashboard")` (`requireRole`) | [platform/super_admin-auth] |
| 3 | src/lib/api-auth.ts | 49 | `if (!roles.includes(profile.role))` (`requireApiRole`) | [platform/super_admin-auth] |
| 4 | src/app/(admin)/layout.tsx | 24 | `if (profileWithCompany.role !== "super_admin") redirect("/dashboard")` | [platform/super_admin-auth] |
| 5 | src/app/api/admin/team/route.ts | 52 | `if (parsed.data.id === profile.id && parsed.data.role !== "super_admin")` (self-demote guard) | [platform/super_admin-auth] |
| 6 | src/app/api/admin/team/route.ts | 61 | `.update({ role: parsed.data.role })` (WRITE to profiles.role) | [platform/super_admin-auth] (write) |
| 7 | src/app/api/quotes/[id]/pdf/route.ts | 20 | `if (profile.role !== "super_admin")` then company-scope fallback | [tenant-auth] + [platform] mixed |
| 8 | src/app/api/orders/stats/route.ts | 11 | `const isAdmin = profile.role === "super_admin"` | [tenant-auth] scope gate |
| 9 | src/app/api/orders/route.ts | 82 | `const isAdmin = profile.role === "super_admin"` | [tenant-auth] scope gate |
| 10 | src/app/api/orders/[id]/route.ts | 57 | `if (profile.role === "super_admin") return ...` | [tenant-auth] scope gate |
| 11 | src/app/api/orders/[id]/recipients/route.ts | 39 | `if (profile.role !== "super_admin")` then company check | [tenant-auth] scope gate |
| 12 | src/app/api/invoices/[id]/pdf/route.ts | 24 | `profile.role !== "super_admin" && invoice.company_id !== profile.company_id` | [tenant-auth] scope gate |
| 13 | src/app/api/invoices/[id]/payments/route.ts | 34 | `if (profile.role !== "super_admin")` then company check | [tenant-auth] scope gate |
| 14 | src/app/api/invoices/[id]/route.ts | 47 | `if (profile.role === "super_admin") return ...` | [tenant-auth] scope gate |
| 15 | src/app/api/invoices/stats/route.ts | 10 | `const isAdmin = profile.role === "super_admin"` | [tenant-auth] scope gate |
| 16 | src/app/api/invoices/route.ts | 61 | `const isAdmin = profile.role === "super_admin"` | [tenant-auth] scope gate |
| 17 | src/components/shared/mobile-nav.tsx | 131 | `{profile.role === "super_admin" ? (<Link href="/admin">...` | [display-only] |
| 18 | src/components/dashboard/Sidebar.tsx | 190 | `role={profile.role}` passed to SidebarBody | [display-only] |
| 19 | src/components/dashboard/UserMenu.tsx | 83 | `{profile.role === "super_admin" ? (<Link href="/admin">...` | [display-only] |
| 20 | src/components/dashboard/MobileSidebar.tsx | 69 | `role={profile.role}` passed to SidebarBody | [display-only] |
| 21 | src/components/auth/UserMenu.tsx | 72 | `{profile.role === "super_admin" ? (<Link href="/admin">...` | [display-only] — **"Admin Panel" dropdown link** |
| 22 | src/components/auth/ProtectedContent.tsx | 32,38 | `roles.includes(profile.role)` (client guard) | [platform/super_admin-auth] (client-side, non-authoritative) |
| 23 | src/components/admin/TeamList.tsx | 85 | `<Select value={m.role} ...>` (admin edits member roles) | [platform/super_admin-auth] (display+write UI) |
| 24 | src/lib/utils/csv-parser.ts | 16 | `role: row.role ?? undefined` (employee CSV import) | [other] — employee job-title, NOT profiles.role |
| 25 | src/lib/engines/archetype.ts | 23 | `brief.role` (archetype detection) | [other] — employee job-title |
| 26 | src/app/(marketing)/page.tsx | 844 | `{t.role}` (testimonial author role) | [other] — static content |

## Additional context (not a direct `profiles.role` read but relevant to migration)
- **src/lib/authz/context.ts** — the NEW model shim (`getAuthContext`) reading `platform_staff` + `company_members`. Comment (lines 9-11) states Prompt 2 migrates every call site off `profiles.role` onto this. **Nothing consumes it yet.**
- **src/lib/supabase/server.ts** (lines 5-6) — header comment declaring `profiles.role` DEPRECATED / removed in Prompt 2.

## Headline
`profiles.role` is read in **~23 code locations** (excluding the 3 `[other]` false-positives).
The role model conflates two planes: it uses a single `super_admin` value both to gate the
platform/admin plane (`requireRole`, `(admin)/layout`, `/api/admin/team`) AND as a
cross-tenant "see everything" scope override inside tenant billing/order/quote routes
(items 7-16). Splitting these is the core Prompt 2 risk.
