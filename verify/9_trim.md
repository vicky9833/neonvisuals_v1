# Item 9 — `product-copy.ts` `.trim()` crash fixed

## Root cause (recon C8)
`scripts/product-copy.ts` → `humaniseName(name)` (lines ~304-307) ran
`name.replace(/…/).replace(/…/).trim()`. When `name` arrived `undefined`/`null`
(folder-/DB-derived names during catalog generation), the first `.replace` threw
`TypeError: Cannot read properties of undefined (reading 'replace')`.

## Before
```ts
function humaniseName(name: string): string {
  const cleaned = name
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
```

## After
```ts
function humaniseName(name: string | null | undefined): string {
  // Guard: name can arrive undefined/null at runtime. Coerce to "" so the
  // .replace().replace().trim() chain can never throw; empty → GENERIC_LABEL.
  const cleaned = (name ?? "")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
```
`buildFallbackCopy` and `getProductCopy` signatures widened to
`string | null | undefined` so the guard is honest end-to-end.

## Previously-crashing input now handled
`buildFallbackCopy(undefined)` and `getProductCopy("NV-Z-999", undefined)` now
return the safe generic copy ("This piece - designed to be remembered", …) instead
of throwing.

## Tests
Added `describe("Item 9 — undefined/null name no longer crashes", …)` to
`scripts/product-copy.test.ts`:
```
 ✓ scripts/product-copy.test.ts (6 tests)
 Test Files  1 passed (1)
      Tests  6 passed (6)
```
(includes the existing 100-run price-free property test — still green.)
