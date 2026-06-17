-- =============================================================================
-- Neon Visuals — Occasion Calendar + Reminders (009)
-- =============================================================================
-- Adds company festival preferences, custom occasions, and generated reminders.
-- Employee birthdays + work anniversaries are NOT stored here — they are derived
-- live from the employees table by the occasion engine.
-- Festivals live in festival_calendar (migration 001 / seed). company_festivals
-- records per-company opt-in + optional date overrides.
-- =============================================================================

-- ---------- company festival preferences ------------------------------------
CREATE TABLE IF NOT EXISTS company_festivals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  festival_id UUID NOT NULL REFERENCES festival_calendar(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  custom_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, festival_id)
);

-- ---------- custom occasions -------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_occasions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  occasion_date DATE NOT NULL,
  recurrence TEXT DEFAULT 'none'
    CHECK (recurrence IN ('none', 'yearly', 'monthly', 'quarterly')),
  occasion_type TEXT DEFAULT 'custom'
    CHECK (occasion_type IN ('custom', 'company_anniversary', 'team_event', 'offsite', 'training', 'celebration', 'other')),
  reminder_days_before INTEGER[] DEFAULT ARRAY[7, 3, 1],
  employee_ids UUID[],
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- reminders --------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL
    CHECK (reminder_type IN ('birthday', 'work_anniversary', 'festival', 'custom_occasion')),
  title TEXT NOT NULL,
  description TEXT,
  occasion_date DATE NOT NULL,
  reminder_date DATE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  custom_occasion_id UUID REFERENCES custom_occasions(id) ON DELETE CASCADE,
  festival_id UUID,
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  is_actioned BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- indexes ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_company_festivals_company ON company_festivals(company_id);
CREATE INDEX IF NOT EXISTS idx_custom_occasions_company ON custom_occasions(company_id);
CREATE INDEX IF NOT EXISTS idx_custom_occasions_date ON custom_occasions(occasion_date);
CREATE INDEX IF NOT EXISTS idx_reminders_company ON reminders(company_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_read ON reminders(is_read);

-- ---------- RLS --------------------------------------------------------------
ALTER TABLE company_festivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_occasions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Company access company_festivals' AND tablename = 'company_festivals') THEN
    CREATE POLICY "Company access company_festivals" ON company_festivals
      FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
      WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Company access custom_occasions' AND tablename = 'custom_occasions') THEN
    CREATE POLICY "Company access custom_occasions" ON custom_occasions
      FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
      WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Company access reminders' AND tablename = 'reminders') THEN
    CREATE POLICY "Company access reminders" ON reminders
      FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
      WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admin company_festivals' AND tablename = 'company_festivals') THEN
    CREATE POLICY "Super admin company_festivals" ON company_festivals
      FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admin custom_occasions' AND tablename = 'custom_occasions') THEN
    CREATE POLICY "Super admin custom_occasions" ON custom_occasions
      FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admin reminders' AND tablename = 'reminders') THEN
    CREATE POLICY "Super admin reminders" ON reminders
      FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role company_festivals' AND tablename = 'company_festivals') THEN
    CREATE POLICY "Service role company_festivals" ON company_festivals
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role custom_occasions' AND tablename = 'custom_occasions') THEN
    CREATE POLICY "Service role custom_occasions" ON custom_occasions
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role reminders' AND tablename = 'reminders') THEN
    CREATE POLICY "Service role reminders" ON reminders
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ---------- updated_at trigger ----------------------------------------------
DROP TRIGGER IF EXISTS custom_occasions_updated_at ON custom_occasions;
CREATE TRIGGER custom_occasions_updated_at
  BEFORE UPDATE ON custom_occasions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- End of migration 009
-- =============================================================================
