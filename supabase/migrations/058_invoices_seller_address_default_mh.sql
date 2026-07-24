-- =============================================================================
-- Neon Visuals - correct the stale invoices.seller_address DEFAULT (058)
-- =============================================================================
-- 013_billing_invoicing.sql:42 set the seller_address column DEFAULT to the OLD
-- Karnataka identity ('Bangalore, Karnataka, India'), which would print a
-- Karnataka address on invoices for the Maharashtra-registered seller
-- (GSTIN 27..., state code 27). This ADDITIVE change updates ONLY that column
-- default to the current Mumbai (Maharashtra) registered address.
--
-- Scope: default value only. No column add/drop, no constraint/policy/trigger
-- change, and the invoice-numbering trigger is intentionally untouched
-- (that is Phase 4 proper). invoices currently has 0 rows, so no existing data
-- is affected; only future inserts that omit seller_address pick up the new
-- default.
--
-- Not changed (verified, non-stale): seller_name DEFAULT 'Neon Visuals' (correct
-- trade name); seller_gstin and seller_pan have NO default / no hardcoded value.
-- =============================================================================

ALTER TABLE public.invoices
  ALTER COLUMN seller_address SET DEFAULT 'Room No 20, Vishwakarma Rahiwashi Sangh, Jogeshwari Vikhroli Link Road, Near SEEPZ Quarters, Andheri East, Mumbai, Maharashtra 400093, India';

COMMENT ON COLUMN public.invoices.seller_address IS
  'Seller postal address printed on tax invoices. Default corrected in 058 to the Maharashtra (Mumbai) GST-registered address; was the stale Karnataka value from 013.';
