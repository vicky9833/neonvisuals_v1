-- =============================================================================
-- Neon Visuals — Gift History + Memory Engine (010)
-- =============================================================================
-- Records every gift ever sent (permanent institutional memory) and the
-- learned per-employee preferences that power duplicate detection + scored
-- recommendations. Company-scoped via RLS. Records are soft-archived, never
-- deleted. Financial columns are INTERNAL only (never shown to clients).
-- =============================================================================

-- ---------- gift records -----------------------------------------------------
CREATE TABLE IF NOT EXISTS gift_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  product_sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  collection_code TEXT,

  occasion_type TEXT NOT NULL,
  occasion_label TEXT,
  gifted_date DATE NOT NULL,

  packaging_tier TEXT,
  personalisation_level TEXT,
  narrative_message TEXT,
  engraving_text TEXT,

  delivery_status TEXT DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'in_production', 'shipped', 'delivered', 'returned')),
  delivered_date DATE,
  delivery_address TEXT,
  tracking_number TEXT,

  recipient_reaction TEXT,
  desk_test_status TEXT DEFAULT 'unknown'
    CHECK (desk_test_status IN ('on_desk', 'kept_elsewhere', 'unknown', 'not_kept')),
  desk_test_checked_date DATE,
  feedback_notes TEXT,
  linkedin_posted BOOLEAN DEFAULT false,

  unit_cost NUMERIC,
  unit_price NUMERIC,

  quote_id UUID,
  order_id UUID,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archived BOOLEAN DEFAULT false
);

-- ---------- employee preferences (learned) ----------------------------------
CREATE TABLE IF NOT EXISTS employee_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  preferred_collections TEXT[],
  avoided_products TEXT[],
  preferred_packaging TEXT,

  archetype TEXT,
  gift_personality TEXT,
  dietary_notes TEXT,
  allergies TEXT,

  total_gifts_received INTEGER DEFAULT 0,
  total_gifts_on_desk INTEGER DEFAULT 0,
  desk_test_score NUMERIC DEFAULT 0,
  last_gifted_date DATE,
  avg_reaction_score NUMERIC,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- indexes ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_gift_records_company ON gift_records(company_id);
CREATE INDEX IF NOT EXISTS idx_gift_records_employee ON gift_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_gift_records_sku ON gift_records(product_sku);
CREATE INDEX IF NOT EXISTS idx_gift_records_date ON gift_records(gifted_date);
CREATE INDEX IF NOT EXISTS idx_gift_records_occasion ON gift_records(occasion_type);
CREATE INDEX IF NOT EXISTS idx_employee_prefs_employee ON employee_preferences(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_prefs_company ON employee_preferences(company_id);

-- ---------- RLS --------------------------------------------------------------
ALTER TABLE gift_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Company access gift_records' AND tablename = 'gift_records') THEN
    CREATE POLICY "Company access gift_records" ON gift_records
      FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
      WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admin gift_records' AND tablename = 'gift_records') THEN
    CREATE POLICY "Super admin gift_records" ON gift_records
      FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role gift_records' AND tablename = 'gift_records') THEN
    CREATE POLICY "Service role gift_records" ON gift_records
      FOR ALL USING (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Company access employee_preferences' AND tablename = 'employee_preferences') THEN
    CREATE POLICY "Company access employee_preferences" ON employee_preferences
      FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
      WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admin employee_preferences' AND tablename = 'employee_preferences') THEN
    CREATE POLICY "Super admin employee_preferences" ON employee_preferences
      FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role employee_preferences' AND tablename = 'employee_preferences') THEN
    CREATE POLICY "Service role employee_preferences" ON employee_preferences
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ---------- updated_at triggers (reuse set_updated_at from migration 001) ----
DROP TRIGGER IF EXISTS gift_records_updated_at ON gift_records;
CREATE TRIGGER gift_records_updated_at
  BEFORE UPDATE ON gift_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS employee_prefs_updated_at ON employee_preferences;
CREATE TRIGGER employee_prefs_updated_at
  BEFORE UPDATE ON employee_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- End of migration 010
-- =============================================================================
