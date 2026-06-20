-- ============================================================
-- 011_order_management.sql — Order Management (Prompt 13)
-- ============================================================
-- IMPORTANT — READ BEFORE APPLYING:
-- Migration 001 created legacy `orders` and `order_items` tables scoped by
-- `org_id` (the superseded organizations/users model), using INT Rupee columns
-- and the `order_status`/`payment_status` ENUMs. The Prompt 07–12 platform has
-- moved to the company/profile model (companies, profiles, employees.company_id,
-- gift_records.company_id). This migration replaces the legacy order tables with
-- company-scoped equivalents.
--
-- These legacy tables are UNUSED (no application code references them and no
-- orders have ever been created). Before running, you may confirm with:
--     SELECT count(*) FROM orders;        -- expect 0
--     SELECT count(*) FROM order_items;   -- expect 0
-- The DROP ... CASCADE below removes them. This is destructive but safe on the
-- empty legacy tables.
-- ============================================================

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;

-- ============================================================
-- Orders
-- ============================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE, -- NV-O-2026-0001 (auto-generated)
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id), -- optional link to source quote

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'confirmed', 'in_production', 'quality_check', 'packed',
    'shipped', 'delivered', 'completed', 'cancelled'
  )),

  -- Occasion context
  occasion_type TEXT,
  occasion_label TEXT, -- e.g. "Diwali 2026", "Q3 Onboarding Batch"

  -- Quantities
  kit_count INTEGER NOT NULL DEFAULT 1,
  packaging_tier TEXT DEFAULT 'standard'
    CHECK (packaging_tier IN ('essential', 'standard', 'premium', 'flagship')),
  personalisation_level TEXT DEFAULT 'name_occasion',

  -- Pricing (admin-only — never shown to clients)
  subtotal NUMERIC,
  packaging_total NUMERIC,
  personalisation_total NUMERIC,
  rush_surcharge NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  grand_total NUMERIC,
  per_kit_investment NUMERIC,

  -- Delivery
  delivery_address TEXT,
  delivery_city TEXT DEFAULT 'Bangalore',
  delivery_pincode TEXT,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  tracking_number TEXT,
  courier_partner TEXT,

  -- Payment
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'advance_received', 'partially_paid', 'fully_paid', 'refunded'
  )),
  advance_amount NUMERIC,
  advance_date DATE,
  balance_amount NUMERIC,
  balance_date DATE,

  -- Rush
  is_rush BOOLEAN DEFAULT false,
  rush_days INTEGER,

  -- Notes
  internal_notes TEXT,        -- admin only
  client_notes TEXT,          -- visible to client
  special_instructions TEXT,

  -- Meta
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Order line items (products × quantities, price snapshot)
-- ============================================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_sku TEXT NOT NULL,
  product_name TEXT NOT NULL, -- snapshot
  collection_code TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC,  -- admin only
  line_total NUMERIC,  -- admin only
  personalisation_type TEXT,
  engraving_text_template TEXT, -- e.g. "{name} — {date}"
  notes TEXT,
  sort_order INTEGER DEFAULT 0
);

-- ============================================================
-- Order recipients (which employee gets this order)
-- ============================================================
CREATE TABLE order_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,        -- snapshot (survives employee deletion)
  recipient_email TEXT,
  recipient_department TEXT,
  personalisation_name TEXT NOT NULL,  -- exact name to engrave
  personalisation_message TEXT,        -- individual narrative card message
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN (
    'pending', 'in_production', 'packed', 'shipped', 'delivered', 'returned'
  )),
  delivered_date DATE,
  tracking_number TEXT,                -- individual tracking if different
  gift_record_id UUID REFERENCES gift_records(id), -- linked after delivery
  notes TEXT
);

-- ============================================================
-- Order status history (audit trail)
-- ============================================================
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Auto-numbering: NV-O-YYYY-XXXX
-- ============================================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  next_num INTEGER;
BEGIN
  year_str := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CAST(split_part(order_number, '-', 4) AS INTEGER)
  ), 0) + 1 INTO next_num
  FROM orders
  WHERE order_number LIKE 'NV-O-' || year_str || '-%';
  NEW.order_number := 'NV-O-' || year_str || '-' || lpad(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_company ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_quote ON orders(quote_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_recipients_order ON order_recipients(order_id);
CREATE INDEX IF NOT EXISTS idx_order_recipients_employee ON order_recipients(employee_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Company members may READ their own orders (pricing stripped at the API layer).
DROP POLICY IF EXISTS "Company read orders" ON orders;
CREATE POLICY "Company read orders" ON orders
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Company read order_items" ON order_items;
CREATE POLICY "Company read order_items" ON order_items
  FOR SELECT USING (order_id IN (SELECT id FROM orders WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Company read order_recipients" ON order_recipients;
CREATE POLICY "Company read order_recipients" ON order_recipients
  FOR SELECT USING (order_id IN (SELECT id FROM orders WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Company read order_status_history" ON order_status_history;
CREATE POLICY "Company read order_status_history" ON order_status_history
  FOR SELECT USING (order_id IN (SELECT id FROM orders WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())));

-- Super admin: full access.
DROP POLICY IF EXISTS "Super admin orders" ON orders;
CREATE POLICY "Super admin orders" ON orders FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
DROP POLICY IF EXISTS "Super admin order_items" ON order_items;
CREATE POLICY "Super admin order_items" ON order_items FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
DROP POLICY IF EXISTS "Super admin order_recipients" ON order_recipients;
CREATE POLICY "Super admin order_recipients" ON order_recipients FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
DROP POLICY IF EXISTS "Super admin order_status_history" ON order_status_history;
CREATE POLICY "Super admin order_status_history" ON order_status_history FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Service role: full access (server-side engines use the service role key).
DROP POLICY IF EXISTS "Service role orders" ON orders;
CREATE POLICY "Service role orders" ON orders FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role order_items" ON order_items;
CREATE POLICY "Service role order_items" ON order_items FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role order_recipients" ON order_recipients;
CREATE POLICY "Service role order_recipients" ON order_recipients FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role order_status_history" ON order_status_history;
CREATE POLICY "Service role order_status_history" ON order_status_history FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- updated_at trigger (shared set_updated_at() from migration 001)
-- ============================================================
DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
