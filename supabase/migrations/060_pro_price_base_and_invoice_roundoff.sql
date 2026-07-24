-- =============================================================================
-- Neon Visuals - Pro price "Rs 1,999 + GST" support (060)  [Phase 6]
-- =============================================================================
-- ADDITIVE ONLY. Two nullable columns, no backfill (both target tables have the
-- relevant rows at 0 — 0 subscriptions ever charged, 0 subscription invoices).
--
--   subscriptions.base_amount (integer, paise)
--     The PRE-TAX base the subscription was sold at (the advertised Rs 1,999 =
--     199900 paise). subscriptions.amount stays the CHARGED all-in amount
--     (base + GST, Section-170 rounded = 235900 paise). Snapshotting the base at
--     checkout means a future price change never re-derives an old row's base:
--     the invoice for an old subscription still shows the base it was sold at.
--     NULLABLE: legacy rows (none today) fall back to treating `amount` as
--     GST-inclusive, exactly as before this phase.
--
--   invoices.round_off (numeric, rupees)
--     The Section-170 rounding delta shown as its OWN value on the tax invoice
--     (taxable + tax + round_off == grand_total), never silently absorbed.
--     NULLABLE: existing/legacy invoices keep round_off NULL and are unchanged;
--     the PDF renders the Round Off row only when it is non-null and non-zero.
--
-- No constraint, policy, trigger, or existing column is altered.
-- =============================================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS base_amount integer;

COMMENT ON COLUMN public.subscriptions.base_amount IS
  'Pre-tax base amount in paise (the advertised Rs 1,999 = 199900), snapshot at checkout. subscriptions.amount is the CHARGED all-in (base + GST). NULL for legacy rows. Added in 060 (Phase 6).';

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS round_off numeric;

COMMENT ON COLUMN public.invoices.round_off IS
  'Section-170 rounding delta in rupees, shown as its own line on the invoice so taxable + tax + round_off == grand_total. NULL/legacy invoices are unchanged. Added in 060 (Phase 6).';

notify pgrst, 'reload schema';
