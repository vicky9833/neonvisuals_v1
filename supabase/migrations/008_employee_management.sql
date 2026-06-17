-- =============================================================================
-- Neon Visuals — Employee Management (008)
-- =============================================================================
-- Reconciles the employees table (migration 001, org-scoped) with the new
-- company-scoped auth model. Adds company_id + gifting-personalisation columns
-- and company-scoped RLS. Existing org_id data is left untouched.
--
-- Column mapping note: the table already has `full_name` (NOT NULL), `birthday`,
-- and `interests TEXT[]` from 001. The app layer maps name→full_name and uses
-- the new `date_of_birth` column. The legacy `interests TEXT[]` is converted to
-- TEXT to match the free-text gifting brief (safe: array_to_string preserves
-- any existing values).
-- =============================================================================

-- ---------- company scope + gifting columns ---------------------------------
ALTER TABLE employees ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_email TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tshirt_size TEXT
  CHECK (tshirt_size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS dietary_preference TEXT
  CHECK (dietary_preference IN ('vegetarian', 'non_vegetarian', 'vegan', 'no_preference'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hobbies TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Bangalore';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- These already exist from 001; guarded for safety.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_code TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Convert legacy interests TEXT[] → TEXT (free-text gifting brief).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'interests'
      AND data_type = 'ARRAY'
  ) THEN
    ALTER TABLE employees
      ALTER COLUMN interests TYPE TEXT USING array_to_string(interests, ', ');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'interests'
  ) THEN
    ALTER TABLE employees ADD COLUMN interests TEXT;
  END IF;
END $$;

-- ---------- indexes ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_joining_date ON employees(joining_date);
CREATE INDEX IF NOT EXISTS idx_employees_date_of_birth ON employees(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);

-- ---------- RLS: company-scoped ---------------------------------------------
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Company members read own employees' AND tablename = 'employees') THEN
    CREATE POLICY "Company members read own employees" ON employees
      FOR SELECT USING (
        company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Company admins insert employees' AND tablename = 'employees') THEN
    CREATE POLICY "Company admins insert employees" ON employees
      FOR INSERT WITH CHECK (
        company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Company admins update employees' AND tablename = 'employees') THEN
    CREATE POLICY "Company admins update employees" ON employees
      FOR UPDATE USING (
        company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Company admins delete employees' AND tablename = 'employees') THEN
    CREATE POLICY "Company admins delete employees" ON employees
      FOR DELETE USING (
        company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admins read all employees' AND tablename = 'employees') THEN
    CREATE POLICY "Super admins read all employees" ON employees
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role employees' AND tablename = 'employees') THEN
    CREATE POLICY "Service role employees" ON employees
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ---------- updated_at trigger ----------------------------------------------
-- set_updated_at() is defined in migration 001; reuse it.
DROP TRIGGER IF EXISTS employees_updated_at ON employees;
CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- End of migration 008
-- =============================================================================
