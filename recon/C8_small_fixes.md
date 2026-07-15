# C8 — SMALL FIXES LOCATED (locate only — not fixed)

## 1. `product-copy.ts` `.trim()` crash
- **File:** `scripts/product-copy.ts`
- **Crash site:** `humaniseName()`, lines **304–307**:
  ```ts
  function humaniseName(name: string): string {
    const cleaned = name
      .replace(/[^A-Za-z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();          // <- end of the chain the crash is attributed to
  ```
- **What is undefined:** the **`name` parameter**. It is typed `string` but at runtime can
  arrive `undefined`. When it does, `name.replace(...)` (start of the `.replace().replace().trim()`
  chain) throws `TypeError: Cannot read properties of undefined (reading 'replace')`.
- **Call path that delivers the undefined value:**
  `getProductCopy(sku, name, collection)` (line 373) → `buildFallbackCopy(name, …)` (line 382)
  → `humaniseName(name)` (line 336). The `name` originates from a product/SKU whose
  display- or folder-derived name is undefined during catalog generation
  (`scripts/generate-catalog.ts` consumers).
- Note: the other `.trim()` at line 335 (`collectionDisplayName?.trim() ?? ""`) is already
  null-safe via optional chaining — it is **not** the crash.
- **Fix later (not applied):** guard the input, e.g. `humaniseName(name?: string)` with
  `const cleaned = (name ?? "").replace(...)`, and/or default `name` in `buildFallbackCopy`.

## 2. Email "Open Sales Pipeline" button
- **File:** `src/lib/services/email-templates.ts`
- **Occurrence A — lead-alert template, lines 266–268:**
  ```ts
  ctaText: "Open Sales Pipeline →",
  ctaUrl: `${APP_URL}/admin/leads`,
  ```
- **Occurrence B — new-lead notification, lines 309–311** (WhatsApp-or-pipeline fallback):
  ```ts
  ctaText: params.whatsappUrl ? "Chat on WhatsApp →" : "Open Sales Pipeline →",
  ctaUrl: params.whatsappUrl ?? `${APP_URL}/admin/leads`,
  ```
- **Current target:** `${APP_URL}/admin/leads`.
- **What it should be (flagged, depends on Prompt 2 routing):** the platform-plane CRM lives
  under `/admin/*` today, but Prompt 2 renames the platform plane (the prompt references
  `/ops`). If the leads CRM moves to `/ops/leads`, this CTA must be updated to
  `${APP_URL}/ops/leads`. **The exact "should be" URL depends on the Prompt 2 plane/route
  decision — flagged, not guessed.**

## Headline
Both small fixes located. (1) `humaniseName` crashes when `name` is `undefined` at the
`.replace().replace().trim()` chain (scripts/product-copy.ts:304–307). (2) The "Open Sales
Pipeline" email CTA currently points to `${APP_URL}/admin/leads` in two spots
(email-templates.ts:266–268 and 309–311); its correct destination hinges on the Prompt 2
platform-route rename.
