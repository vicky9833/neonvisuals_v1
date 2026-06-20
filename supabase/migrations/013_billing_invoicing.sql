-- ============================================================
-- 013_billing_invoicing.sql — Billing + Invoicing + Payments (Prompt 15)
-- ============================================================
-- IMPORTANT — READ BEFORE APPLYING:
-- Migration 001 created legacy `invoices` (#17) and `payments` (#18) tables for
-- the superseded org/user model (org_id -> organizations, INT amounts, enum
-- statuses). The platform now uses the company/profile model. This migration
-- replaces them with company-scoped, GST-compliant equivalents.
--
-- These legacy tables are UNUSED (no application code references them). Confirm:
--   SELECT count(*) FROM invoices;   SELECT count(*) FROM payments;   (expect 0)
-- DROP ... CASCADE removes them (payments FKs invoices, so drop payments first).
-- Destructive but safe on the empty legacy tables.
-- ============================================================

DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;

-- ============================================================
-- Invoices
-- ============================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE, -- NV-INV-2026-0001 (auto-generated)
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  invoice_type TEXT NOT NULL DEFAULT 'standard' CHECK (invoice_type IN (
    'advance', 'balance', 'standard', 'proforma', 'credit_note'
  )),

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled', 'refunded'
  )),

  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_date DATE,

  -- Seller (Neon Visuals)
  seller_name TEXT DEFAULT 'Neon Visuals',
  seller_address TEXT DEFAULT 'Bangalore, Karnataka, India',
  seller_gstin TEXT,
  seller_pan TEXT,

  -- Buyer
  buyer_name TEXT NOT NULL,
  buyer_company TEXT NOT NULL,
  buyer_address TEXT,
  buyer_gstin TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,

  -- Line items snapshot
  line_items JSONB NOT NULL DEFAULT '[]',

  -- Financials
  subtotal NUMERIC NOT NULL,
  gst_rate NUMERIC DEFAULT 18,
  cgst_amount NUMERIC DEFAULT 0,
  sgst_amount NUMERIC DEFAULT 0,
  igst_amount NUMERIC DEFAULT 0,
  is_intra_state BOOLEAN DEFAULT true,
  total_gst NUMERIC NOT NULL,
  grand_total NUMERIC NOT NULL,
  amount_in_words TEXT,

  -- Payment
  amount_due NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  payment_percentage NUMERIC,

  -- Razorpay
  razorpay_payment_link_id TEXT,
  razorpay_payment_link_url TEXT,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,

  -- Notes
  notes TEXT,
  internal_notes TEXT,
  terms TEXT,

  -- Meta
  pdf_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Payments
-- ============================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'razorpay' CHECK (payment_method IN (
    'razorpay', 'bank_transfer', 'upi', 'cash', 'cheque', 'other'
  )),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'refunded'
  )),

  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  razorpay_signature TEXT,
  razorpay_payment_link_id TEXT,

  bank_reference TEXT,
  payment_proof_url TEXT,

  payment_date TIMESTAMPTZ,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Auto-numbering: NV-INV-YYYY-XXXX
-- ============================================================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  next_num INTEGER;
BEGIN
  year_str := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(split_part(invoice_number, '-', 4) AS INTEGER)
  ), 0) + 1 INTO next_num
  FROM invoices
  WHERE invoice_number LIKE 'NV-INV-' || year_str || '-%';
  NEW.invoice_number := 'NV-INV-' || year_str || '-' || lpad(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_invoice_number ON invoices;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay ON payments(razorpay_payment_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company read invoices" ON invoices;
CREATE POLICY "Company read invoices" ON invoices
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Company read payments" ON payments;
CREATE POLICY "Company read payments" ON payments
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Super admin invoices" ON invoices;
CREATE POLICY "Super admin invoices" ON invoices FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
DROP POLICY IF EXISTS "Super admin payments" ON payments;
CREATE POLICY "Super admin payments" ON payments FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "Service role invoices" ON invoices;
CREATE POLICY "Service role invoices" ON invoices FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role payments" ON payments;
CREATE POLICY "Service role payments" ON payments FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- updated_at trigger
-- ============================================================
DROP TRIGGER IF EXISTS invoices_updated_at ON invoices;
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
