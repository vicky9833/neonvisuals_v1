# 5b prod build fix — exclude harness scripts from the build graph (foundation `2f34f82`)

## What broke
The prod build for the 5b merge (`3586a08`) FAILED: Vercel type-checked `verify5b/_diag2.ts`
(a throwaway diagnostic harness that got committed and rode into main) — `u!.user.id` "possibly
null". Because the build failed, prod kept serving 5a (functional; no outage).

## Why "preview green" was misleading (the process gap)
The foundation preview ALIAS serves the last SUCCESSFUL deploy. When `f83adc3` (which first
introduced `_diag2.ts`) was pushed, its preview build almost certainly failed on the same error,
so the alias kept serving the earlier `10d1539` deploy — which already had `generateOccasions`
on the dashboard + the festival cap. Every preview check I ran (smoke, probes) was therefore
hitting `10d1539`, not `f83adc3`. My "build green" stamp had been taken on a tree that did NOT
include the harness files. Root cause: build-green was not verified on the FINAL committed tree.

## The fix (scope, not a type-patch)
`tsconfig.json` `exclude` now removes throwaway harnesses from the tsc/`next build` graph:
```json
"exclude": ["node_modules", "verify/**", "verify*/**", "recon*/**"]
```
- Harnesses are NOT imported by any `src/` code (`grep` from src → no matches), so excluding them
  removes only scaffolding from the build graph.
- Fix is at the SCOPE level, so no future `verify*/` harness can break prod — not a one-off patch
  of `_diag2.ts`.
- Mirrors the existing convention (promote-evidence `.md` stays local; harness `.ts` stays out of
  the build).

## Verification ON THE COMMITTED TREE (the discipline that was missing)
Committed the tsconfig change FIRST (`2f34f82`), then built the committed state from scratch:
- `Remove-Item -Recurse -Force .next`
- `npx tsc --noEmit` → **exit 0** (tsc passes even though `_diag2.ts` still has its type error →
  proves the harness is now OUT of scope)
- `npm run build` (Next 16 / Turbopack) → **GREEN**, Proxy middleware registered, 296+ product
  pages prerendered
- `tsc --listFilesOnly | grep verify` → only 2 hits, both legitimate `src/` routes
  (`src/app/api/payments/verify/route.ts`, `src/app/(auth)/verify/page.tsx`). **Zero `verify*/`
  harness files remain in the graph.**

## Status
Foundation = `2f34f82` (pushed). main still `3586a08` (failed prod deploy → prod serving 5a,
functional, no rush). Holding for the preview build to confirm green on the committed tree before
re-promote — NOT re-merging to main until called.
