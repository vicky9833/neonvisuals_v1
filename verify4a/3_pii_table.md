# Item 3 — employee_pii table + §6A RLS — PASS

## Table (migration `031_employee_pii_table`)
`public.employee_pii` (1:1 with employees; employees=0 rows → structure-only):
```
employee_id     uuid PK  FK -> employees(id) ON DELETE CASCADE
company_id      uuid NOT NULL FK -> companies(id) ON DELETE CASCADE
phone_enc            text   -- AES-256-GCM envelope (app-encrypted)
delivery_address_enc text   -- AES-256-GCM envelope (app-encrypted)
city            text        -- plaintext, RLS-gated
pincode         text        -- plaintext, RLS-gated
dob_day  smallint (1..31)   -- plaintext, RLS-gated
dob_month smallint (1..12)  -- plaintext, RLS-gated
notes           text        -- plaintext, RLS-gated
consent_status  text NOT NULL default 'company_asserted'
created_at / updated_at  timestamptz  (trg_employee_pii_updated_at)
```
Index on `company_id`. `revoke all ... from anon` (defense-in-depth on the PII table).

## RLS (5 policies) — §6A reproduced exactly
Read gate helper `can_read_employee_pii(employee_id, company_id)` (SECURITY DEFINER, joins
`employees.department_id`): platform staff OR owner/admin/hr OR manager-of-employee's-dept.
Write helper `can_write_employee_pii(company_id)`: owner/admin/hr.
- `employee_pii_read` (SELECT) → can_read_employee_pii
- `employee_pii_insert` / `employee_pii_update` → can_write_employee_pii
- `employee_pii_delete` → owner/admin
- `employee_pii_service_role` (ALL) → service_role

**This CLOSES the old employees_safe leak** — city/pincode/notes are now behind §6A instead
of visible to every member.

## Acceptance (script `_rls_acceptance.ts`, run `_rls_acceptance_run.txt`) — PASS
Real JWT sessions against a t4a_ company (Eng + Design departments, one employee each):
```
owner       sees BOTH pii rows          PASS
org_admin   sees BOTH pii rows          PASS
hr          sees BOTH pii rows          PASS
finance     sees ZERO pii rows          PASS   (leak closed)
viewer      sees ZERO pii rows          PASS
manager(Eng)    sees Eng pii, DENIED Design pii     PASS
manager(Design) sees Design pii, DENIED Eng pii     PASS
finance/viewer  CAN read identity roster (all-member) PASS
```
phone_enc stored a REAL AES-256-GCM envelope (ciphertext); user JWTs can SELECT the row
(per §6A) but cannot decrypt (get_pii_dek is service_role-only — decryption is server-side).

## Residue
t4a_ rows torn down; owner-member + owner auth-user teardown required the MCP
disable-trigger step (the 3b `trg_guard_last_owner` blocks deleting the sole org_owner) +
`_cleanup_users.mjs`. Final: companies=0, employee_pii=0, auth users t4a_=0.
