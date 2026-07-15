# C4 — PII + ENCRYPTION REALITY

(No real PII values printed — schema + counts only. `employees` currently has **0 rows**.)

## `employees` columns (full list, 40 columns)
id (uuid, NOT NULL), employee_code (text), full_name (text, NOT NULL), email (text),
**phone (text)**, department (text), designation (text), reporting_manager (text),
joining_date (date), hometown (text), interests (text), archetype (enum), archetype_signals
(jsonb), linkedin_url (text), profile_notes (text), dietary_restrictions (text),
gift_preferences (text), tier (text), is_active (bool, NOT NULL), metadata (jsonb),
created_at (timestamptz, NOT NULL), updated_at (timestamptz, NOT NULL), company_id (uuid),
manager_name (text), manager_email (text), tshirt_size (text), dietary_preference (text),
hobbies (text), **delivery_address (text)**, city (text), pincode (text), notes (text),
avatar_url (text), created_by (uuid), **dob_day (smallint)**, **dob_month (smallint)**,
type (text, NOT NULL), consent_status (text, NOT NULL), offboarded_at (timestamptz),
purge_after (timestamptz).

## Encryption reality — **PLAINTEXT, NOT ENCRYPTED**
- There are **NO `phone_enc` / `shipping_address_enc` columns**. Those columns do not exist.
- PII lives in plaintext columns: `phone`, `delivery_address`, `city`, `pincode`,
  `dob_day`, `dob_month`. No `_enc` naming, no ciphertext columns, no app-layer envelope.
- Extensions installed: **pgcrypto 1.3** and **supabase_vault 0.3.1** are present, BUT the
  `employees` table does **not** use them. Capability exists; it is **unused**. There is
  **no encryption key held anywhere** for employee PII (nothing to hold — it's plaintext).

## `employees_safe` SECURITY DEFINER view — EXISTS ✅
Exposes 33 columns; **omits** these 7 from the base table:
`phone`, `delivery_address`, `dob_day`, `dob_month`, `profile_notes`, `archetype_signals`,
`metadata`.

View logic (company-scope only, no role/dept branch inside the view):
```sql
SELECT <33 non-PII cols> FROM employees e
WHERE is_platform_staff() OR (company_id IN (SELECT user_company_ids()));
```

## Does current RLS/view logic encode the §6A PII rule?
**Substantially YES — enforced at the BASE-TABLE RLS layer, not inside the view.**
Base `employees` policies:
- `employees_read_full` (SELECT): platform staff → all; OR company member AND
  (`org_owner`/`org_admin`/`hr` → all company rows) OR (`manager` → only rows where
  `department = <manager's own department name>`).
  → **finance and viewer are NOT in the SELECT role list → they get ZERO base rows** and
  must read `employees_safe` (PII-free). ✅
  → **manager outside own department** gets no base row for other-dept employees; they see
  only non-PII columns via `employees_safe`. ✅
- INSERT/UPDATE: `org_owner`/`org_admin`/`hr` only. DELETE: `org_owner`/`org_admin` only.
- `employees_service_role` (ALL): `auth.role() = 'service_role'` bypass (the RLS-bypass path).

So the §6A rule (finance / manager-outside-own-dept / viewer must NOT see dob/phone/address)
**is materially satisfied**: those principals cannot read the base PII columns and fall back
to the safe view.

### ⚠️ Gaps to flag (assumptions for Prompt 2)
1. **`city` + `pincode` remain exposed in `employees_safe`.** If §6A "address" is meant to
   include city/pincode, finance/viewer/out-of-dept-manager can still see partial address.
   Confirm whether that's acceptable or a leak to close.
2. **PII is plaintext at rest.** If §6A / compliance expects encryption of dob/phone/address,
   that work does not exist yet. pgcrypto+vault are available but unwired. Flagged — do we
   need at-rest encryption, or is RLS-based access control the intended control?
3. The safe view carries no role logic itself; it relies entirely on base-table RLS +
   which relation each role is routed to read. Correct today, but fragile if a future policy
   grants finance/viewer base access.

## Headline
No encryption anywhere (plaintext PII; pgcrypto/vault present but unused). The §6A
access rule IS enforced via base-table RLS role/dept logic + the `employees_safe` view.
Open questions: city/pincode still visible in the safe view, and whether at-rest
encryption is actually required.
