# 3a Item 1 — DPA consent at org creation

## Implementation
- `src/lib/authz/dpa.ts` — `DPA_VERSION = "2026-07-16.v1"`, `DPA_DOC_REF`, `DPA_DOC_URL`,
  and the §10 `DPA_ATTESTATION` string.
- `src/app/(auth)/onboarding/actions.ts` — `createCompanyAndCompleteOnboarding`:
  - **Refuses** creation if `!data.dpaAccepted` (returns an error BEFORE any insert).
  - Captures `dpa_ip` from request `headers()` (x-forwarded-for / x-real-ip).
  - Writes all four consent columns on the company insert:
    `dpa_accepted_at = now()`, `dpa_accepted_by = user.id`, `dpa_version = DPA_VERSION`, `dpa_ip`.
- `src/lib/auth-types.ts` — `OnboardingData.dpaAccepted: boolean` (required).
- `src/components/auth/OnboardingWizard.tsx` — required attestation checkbox (§10 text +
  DPA link) in step 2; `handleStep2` blocks submission with an error if unchecked.

## Evidence (real t3a_ org creation writing all four dpa_* columns)
From `_invite_test_run.txt`:
```
=== ITEM 1: DPA row ===
{"id":"93c3f01c-…","name":"t3a_20260716055858_Co",
 "dpa_accepted_at":"2026-07-16T05:59:00.156+00:00",
 "dpa_accepted_by":"854066d1-…","dpa_version":"2026-07-16.v1","dpa_ip":"203.0.113.7"}
dpa_ip present: true | all four dpa_* set: true
```
All four `dpa_*` columns populated, `dpa_ip` present. (The insert mirrors the onboarding
action's shape; the action additionally derives `dpa_ip` from request headers at runtime.)

## Refusal proof (consent absent)
Enforced in the server action (app layer — the DB columns are nullable by design):
```ts
if (!data.dpaAccepted) {
  return { ok:false, error:"You must confirm you're authorised to share your employees'
    data before creating your organisation." };   // returns BEFORE any company insert
}
```
The wizard also blocks client-side (`handleStep2`) and `OnboardingData.dpaAccepted` is a
required field (tsc-enforced at the call site). No company row is created without consent.
