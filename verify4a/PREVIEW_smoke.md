# Prompt 4a — Preview Smoke (DEPLOYED behavioural evidence)

- **Deployed SHA**: `b2992ca` on branch `foundation`
- **Preview host**: `https://neonvisuals-v1-iou9-git-foundation-vicky9833s-projects.vercel.app`
- **Method**: `x-vercel-protection-bypass` header + real GoTrue password-grant JWT SSR cookies.
  PII created/read through the DEPLOYED handlers; admin client only for fixture setup + at-rest
  inspection. Synthetic PII only; key value never printed.
- **Liveness**: owner `GET /api/employees` → **200** (old code would 500 on the renamed PII
  columns; 200 confirms b2992ca is serving). Decrypted-phone reads below further confirm the
  new pii-crypto + employee_pii path is live.
- **Run log**: `verify4a/_preview_smoke_run.txt`
- **Result**: ALL PASS.

## Item 1 — PII strip/attach on the DEPLOYED read route (headline §10)
Employees created via deployed `POST /api/employees` (owner), then `GET /api/employees/[id]`:
```
owner   -> PII present (phone decrypts to submitted plaintext)        PASS
hr      -> PII present (phone decrypts + delivery_address present)    PASS
finance -> PII STRIPPED (phone=null, address/city/pincode/dob/notes=null)  PASS
viewer  -> PII STRIPPED (phone=null, ...)                             PASS
finance/viewer still see identity (name)                              PASS
```
The strip happens on the deployed handler (GET [id] `tenantCapability(view_pii)` → stripPii),
on top of the employee_pii RLS backstop. **finance/viewer never receive PII — §10 holds.**

## Item 2 — own-dept manager split (deployed)
```
manager(Eng) reading Eng employee   -> PII present    PASS
manager(Eng) reading Design employee -> PII stripped  PASS
```
Confirms the spec §6A/§10.6 rule (manager inside own dept sees PII; outside dept does not).

## Item 3 — employee_pii RLS + encryption through the app
- Employee created via the deployed write path (owner) → `employee_pii.phone_enc` inspected at rest:
  it is a ciphertext **envelope** `{v,iv,tag,ct}`, NOT the plaintext.  PASS
- Decrypts (via Vault key + core) to the exact submitted plaintext.  PASS
- `city` stored plaintext (RLS-gated, not encrypted).  PASS

## Item 4 — view gone / no regression
```
employees_safe relation is GONE (PostgREST error)   PASS
GET /                 -> 200      PASS
GET /products         -> 200      PASS
GET /login            -> 200      PASS
GET /register         -> 200      PASS
GET /dashboard        -> 307 /login?redirect=   PASS
GET /nonexistent-xyz  -> 403      PASS
POST /api/leads/capture -> success   PASS
POST /api/contact       -> received  PASS
/dashboard/team renders for owner (3b not regressed)   PASS
```

## Residue teardown (zero)
Employees/PII/leads deleted in-script; owner-member + company + auth users torn down via the
MCP disable-trigger step (`trg_guard_last_owner`) + `_cleanup_users.mjs` (deleted 6).
Final: companies=0, employee_pii total=0, t4a_ leads=0, auth users t4a_=0.

## Verdict
All four checks pass on **deployed** code (`b2992ca`). The §10 headline — PII stripped for
finance/viewer on the deployed route — holds, with hr/owner/own-dept-manager seeing decrypted
PII. No regression to 3a/3b or the public surface. Holding on `foundation` for the promote call.
**Not promoted to main.**
