-- =============================================================================
-- Neon Visuals — Auth: Profiles + Companies (007)
-- =============================================================================
-- Introduces the client-facing auth layer used by Supabase Auth:
--   * companies — client company records, created during onboarding
--   * profiles  — one row per auth.users row (role + onboarding state)
-- A trigger auto-creates a profile on signup. RLS keeps each user scoped to
-- their own data; super admins (Neon Visuals team) can read everything.
--
-- NOTE: This coexists with the internal organizations/users model from 001.
-- The profiles/companies tables back the public client portal auth flow.
-- =============================================================================

-- ---------- companies --------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  industry TEXT,
  employee_count TEXT,            -- range label: '10–50', '50–200', ...
  city TEXT DEFAULT 'Bangalore',
  address TEXT,
  website TEXT,
  logo_url TEXT,
  gstin TEXT,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  gifting_budget TEXT,            -- range label: 'Under ₹1 Lakh', ...
  gifting_occasions TEXT[],       -- which occasions they gift for
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- ---------- profiles ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'client'
    CHECK (role IN ('super_admin', 'admin', 'client')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  avatar_url TEXT,
  is_onboarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- keep updated_at fresh (set_updated_at() defined in migration 001)
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- recursion-safe super-admin check --------------------------------
-- A SELECT policy on `profiles` cannot itself sub-SELECT `profiles` without
-- triggering "infinite recursion detected in policy". This SECURITY DEFINER
-- function bypasses RLS to break the cycle.
CREATE OR REPLACE FUNCTION public.is_profile_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  )
$$;

-- ---------- RLS: profiles ----------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Super admins read all profiles" ON profiles;
CREATE POLICY "Super admins read all profiles" ON profiles
  FOR SELECT USING (public.is_profile_super_admin());

DROP POLICY IF EXISTS "Service role full access" ON profiles;
CREATE POLICY "Service role full access" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- ---------- RLS: companies ---------------------------------------------------
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members read own company" ON companies;
CREATE POLICY "Company members read own company" ON companies
  FOR SELECT USING (
    id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Company admins update own company" ON companies;
CREATE POLICY "Company admins update own company" ON companies
  FOR UPDATE USING (
    id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Super admins read all companies" ON companies;
CREATE POLICY "Super admins read all companies" ON companies
  FOR SELECT USING (public.is_profile_super_admin());

DROP POLICY IF EXISTS "Service role full access companies" ON companies;
CREATE POLICY "Service role full access companies" ON companies
  FOR ALL USING (auth.role() = 'service_role');

-- ---------- auto-create profile on signup -----------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- POST-DEPLOY: Seed the super admin (run MANUALLY after Vikas registers)
-- -----------------------------------------------------------------------------
-- 1. Register normally at /register with contact.neonvisuals@gmail.com
-- 2. Then run the statement below in the Supabase SQL Editor:
--
--    UPDATE profiles SET role = 'super_admin'
--    WHERE email = 'contact.neonvisuals@gmail.com';
--
-- =============================================================================
-- GOOGLE OAUTH SETUP (optional secondary provider)
-- -----------------------------------------------------------------------------
-- Configure in Supabase Dashboard → Authentication → Providers → Google.
--   Redirect URL: https://xserhblhiwtmaiejbvgo.supabase.co/auth/v1/callback
--   Local dev:    http://localhost:3000/auth/callback
-- Then set NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true to reveal the Google buttons.
-- =============================================================================
-- End of migration 007
-- =============================================================================
