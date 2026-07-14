-- =============================================================================
-- Neon Visuals — Tenancy & Identity Foundation (018)
-- =============================================================================
-- Prompt 1 of the multi-tenant refactor. This lays the DB foundation UNDER the
-- current app WITHOUT changing app behaviour:
--   * demolishes the dead migration-001 identity model (organizations/users)
--   * introduces the platform plane (platform_staff) and tenant plane
--     (company_members + departments) — a user may now belong to N companies
--   * adds invites, audit_log, impersonation_sessions, real notifications
--   * kills the birth YEAR on employees (privacy-by-design)
--   * scopes quotes to a company
--   * rebuilds RLS on every tenant table around membership, not profiles.role
--
-- profiles.role is intentionally KEPT (DEPRECATED) — proxy.ts / auth.ts /
-- api-auth.ts / UI menus still read it. It is removed in Prompt 2.
--
-- Applied to hosted project xserhblhiwtmaiejbvgo. Census before apply:
--   companies=0 profiles=2 employees=0 quotes=1 orders=0 invoices=0
--   organizations=0 users=0 (legacy dead)  companies>1 profile = 0
-- =============================================================================

-- =============================================================================
-- 1A. DEMOLISH THE LEGACY MODEL
-- =============================================================================
-- Drop 001-era policies that reference auth_org_id() / is_super_admin() on
-- tables that SURVIVE (dropped tables' policies go with them via CASCADE).
DROP POLICY IF EXISTS "Own org employees"            ON public.employees;
DROP POLICY IF EXISTS "Own org gift history"         ON public.gift_history;
DROP POLICY IF EXISTS "Own org kits"                 ON public.kits;
DROP POLICY IF EXISTS "Own org kit items"            ON public.kit_items;
DROP POLICY IF EXISTS "Own org quote items"          ON public.quote_items;
DROP POLICY IF EXISTS "Own org quotes"               ON public.quotes;
DROP POLICY IF EXISTS "Own org recommendation logs"  ON public.recommendation_logs;
DROP POLICY IF EXISTS "Admins read page views"       ON public.page_views;

-- Drop the dead 001 tables (organizations/users identity model, plus the
-- superseded 001 occasions + notifications tables).
DROP TABLE IF EXISTS public.occasions      CASCADE;  -- computed on-the-fly by the engine now
DROP TABLE IF EXISTS public.notifications  CASCADE;  -- replaced by a real table in 1I
DROP TABLE IF EXISTS public.users          CASCADE;  -- dead identity model
DROP TABLE IF EXISTS public.organizations  CASCADE;  -- dead tenant root

-- Drop the legacy RLS helper functions (CASCADE = backstop for any policy we
-- did not name explicitly above; the post-apply pg_policies sweep verifies).
DROP FUNCTION IF EXISTS public.auth_org_id()    CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;

-- Remove orphaned org columns on employees + KILL the legacy birth-year column.
ALTER TABLE public.employees DROP COLUMN IF EXISTS org_id;
ALTER TABLE public.employees DROP COLUMN IF EXISTS birthday;  -- legacy full-DOB (year), unused

-- Drop the legacy enums (their only consumers — users/organizations — are gone).
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS org_plan;

-- =============================================================================
-- 1B. PLATFORM PLANE — Neon Visuals staff (NO company membership)
-- =============================================================================
CREATE TYPE platform_role AS ENUM ('owner','admin','ops','finance','support');

CREATE TABLE platform_staff (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        platform_role NOT NULL,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 1C. TENANT PLANE — memberships (a user may belong to N companies)
-- =============================================================================
CREATE TYPE company_role AS ENUM
  ('org_owner','org_admin','hr','finance','manager','viewer');

CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  manager_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);
CREATE INDEX idx_departments_company_id ON departments(company_id);

CREATE TABLE company_members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role           company_role NOT NULL,
  department_id  UUID REFERENCES departments(id) ON DELETE SET NULL,
  approval_limit NUMERIC(12,2),            -- NULL = no approval authority
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','suspended')),
  invited_by     UUID REFERENCES auth.users(id),
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);
CREATE INDEX idx_company_members_user   ON company_members(user_id);
CREATE INDEX idx_company_members_company ON company_members(company_id);
-- Exactly one org_owner per company.
CREATE UNIQUE INDEX one_org_owner_per_company
  ON company_members (company_id) WHERE role = 'org_owner';

-- =============================================================================
-- 1D. INVITES — single-use, hashed token, 7-day expiry
-- =============================================================================
CREATE TABLE invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  role          company_role NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  token_hash    TEXT NOT NULL UNIQUE,       -- sha256 hash; raw token only in the email
  expires_at    TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','expired','revoked')),
  invited_by    UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at   TIMESTAMPTZ
);
CREATE UNIQUE INDEX one_pending_invite_per_email
  ON invites (company_id, lower(email)) WHERE status = 'pending';

-- =============================================================================
-- 1E. EXTEND companies — plan, branding, DPA, festivals
-- =============================================================================
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS email_domain         TEXT,
  ADD COLUMN IF NOT EXISTS plan                 TEXT NOT NULL DEFAULT 'free'
                             CHECK (plan IN ('free','pro','enterprise')),
  ADD COLUMN IF NOT EXISTS plan_status          TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS employee_limit       INT  NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS plan_override_by     UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS plan_override_reason TEXT,
  ADD COLUMN IF NOT EXISTS owner_id             UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS brand_primary        TEXT,
  ADD COLUMN IF NOT EXISTS brand_accent         TEXT,
  ADD COLUMN IF NOT EXISTS email_sender_name    TEXT,
  ADD COLUMN IF NOT EXISTS dpa_accepted_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dpa_accepted_by      UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS dpa_version          TEXT,
  ADD COLUMN IF NOT EXISTS dpa_ip               TEXT,
  ADD COLUMN IF NOT EXISTS observed_festivals   TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS blackout_dates       DATE[] DEFAULT '{}';

-- =============================================================================
-- 1F. EMPLOYEES — kill the birth YEAR; add lifecycle/consent columns
-- =============================================================================
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS dob_day   SMALLINT CHECK (dob_day   BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS dob_month SMALLINT CHECK (dob_month BETWEEN 1 AND 12);

UPDATE employees
   SET dob_day   = EXTRACT(DAY   FROM date_of_birth)::smallint,
       dob_month = EXTRACT(MONTH FROM date_of_birth)::smallint
 WHERE date_of_birth IS NOT NULL;

ALTER TABLE employees DROP COLUMN date_of_birth;  -- never stored again

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'employee'
      CHECK (type IN ('employee','client','vendor','partner','external')),
  ADD COLUMN IF NOT EXISTS consent_status TEXT NOT NULL DEFAULT 'company_asserted',
  ADD COLUMN IF NOT EXISTS offboarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS purge_after   TIMESTAMPTZ;

-- TODO(P4): field-level encryption for these columns (Prompt 4).
COMMENT ON COLUMN employees.phone            IS 'PII. TODO(P4): field-level encryption.';
COMMENT ON COLUMN employees.delivery_address IS 'PII. TODO(P4): field-level encryption.';

-- purge_after = offboarded_at + 90 days, maintained by trigger.
CREATE OR REPLACE FUNCTION set_purge_after()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.offboarded_at IS NOT NULL THEN
    NEW.purge_after := NEW.offboarded_at + INTERVAL '90 days';
  ELSE
    NEW.purge_after := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_employees_purge_after ON employees;
CREATE TRIGGER trg_employees_purge_after
  BEFORE INSERT OR UPDATE OF offboarded_at ON employees
  FOR EACH ROW EXECUTE FUNCTION set_purge_after();

-- =============================================================================
-- 1G. QUOTES — tenant-scope
-- =============================================================================
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
-- Best-effort backfill: match free-text client_company to companies.name.
UPDATE quotes q
   SET company_id = c.id
  FROM companies c
 WHERE q.company_id IS NULL
   AND lower(btrim(q.client_company)) = lower(btrim(c.name));
CREATE INDEX IF NOT EXISTS idx_quotes_company_status ON quotes(company_id, status);

-- =============================================================================
-- 1H. AUDIT LOG (append-only) + IMPERSONATION SESSIONS
-- =============================================================================
CREATE TABLE audit_log (
  id             BIGSERIAL PRIMARY KEY,
  actor_user_id  UUID REFERENCES auth.users(id),
  actor_type     TEXT NOT NULL CHECK (actor_type IN ('tenant','platform','system')),
  company_id     UUID REFERENCES companies(id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  entity         TEXT,
  entity_id      TEXT,
  before         JSONB,
  after          JSONB,
  ip             TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_company_created ON audit_log (company_id, created_at DESC);

-- Truly append-only: block UPDATE/DELETE for EVERYONE, incl. service_role
-- (which bypasses RLS). A trigger is the only way to stop the table owner too.
CREATE OR REPLACE FUNCTION audit_log_is_append_only()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only; % is not permitted', TG_OP;
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_log_no_update ON audit_log;
CREATE TRIGGER trg_audit_log_no_update
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_is_append_only();

CREATE TABLE impersonation_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id   UUID NOT NULL REFERENCES auth.users(id),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  target_user_id  UUID REFERENCES auth.users(id),
  reason          TEXT NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,       -- started_at + 60 min (enforced app-side)
  ended_at        TIMESTAMPTZ
);
CREATE INDEX idx_impersonation_company ON impersonation_sessions (company_id, started_at DESC);

-- =============================================================================
-- 1I. NOTIFICATIONS (real) + PREFERENCES
-- =============================================================================
CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id        UUID REFERENCES companies(id) ON DELETE CASCADE,
  type              TEXT NOT NULL,
  title             TEXT NOT NULL,
  body              TEXT,
  link              TEXT,
  read_at           TIMESTAMPTZ,
  channels_sent     TEXT[] DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_recipient
  ON notifications (recipient_user_id, read_at, created_at DESC);

CREATE TABLE notification_prefs (
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type             TEXT NOT NULL,
  in_app           BOOLEAN NOT NULL DEFAULT true,
  email            BOOLEAN NOT NULL DEFAULT true,
  digest_frequency TEXT NOT NULL DEFAULT 'immediate'
                     CHECK (digest_frequency IN ('immediate','daily','weekly','off')),
  PRIMARY KEY (user_id, type)
);

-- =============================================================================
-- STEP 2. BACKFILL from profiles (profiles.role is DEPRECATED: removed in Prompt 2)
-- =============================================================================
-- super_admin -> platform_staff (owner for the founder, admin otherwise).
INSERT INTO platform_staff (user_id, role)
SELECT id,
       CASE WHEN lower(email) = 'contact.neonvisuals@gmail.com'
            THEN 'owner'::platform_role ELSE 'admin'::platform_role END
  FROM profiles WHERE role = 'super_admin'
ON CONFLICT (user_id) DO NOTHING;

-- Platform staff must have NO company membership: strip any stray link.
UPDATE profiles SET company_id = NULL
 WHERE role = 'super_admin' AND company_id IS NOT NULL;

-- admin/client WITH a company -> company_members (org_owner if they created it).
INSERT INTO company_members (company_id, user_id, role)
SELECT p.company_id, p.id,
       CASE WHEN p.id = c.created_by
            THEN 'org_owner'::company_role ELSE 'org_admin'::company_role END
  FROM profiles p
  JOIN companies c ON c.id = p.company_id
 WHERE p.role IN ('admin','client') AND p.company_id IS NOT NULL
ON CONFLICT (company_id, user_id) DO NOTHING;

-- Set companies.owner_id from the creating profile.
UPDATE companies c SET owner_id = p.id
  FROM profiles p
 WHERE p.company_id = c.id AND p.id = c.created_by;

-- =============================================================================
-- STEP 3. RLS HELPER FUNCTIONS (SECURITY DEFINER, STABLE, empty search_path)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_platform_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_staff WHERE user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.platform_role_of()
RETURNS public.platform_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT role FROM public.platform_staff WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.user_company_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT company_id FROM public.company_members
   WHERE user_id = auth.uid() AND status = 'active'
$$;

CREATE OR REPLACE FUNCTION public.has_company_role(
  target_company UUID, allowed public.company_role[]
) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
     WHERE user_id = auth.uid() AND company_id = target_company
       AND status = 'active' AND role = ANY (allowed)
  )
$$;

CREATE OR REPLACE FUNCTION public.user_department_id(target_company UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT department_id FROM public.company_members
   WHERE user_id = auth.uid() AND company_id = target_company
     AND status = 'active' LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION
  public.is_platform_staff(), public.platform_role_of(), public.user_company_ids(),
  public.has_company_role(UUID, public.company_role[]), public.user_department_id(UUID)
  TO authenticated, anon;

-- =============================================================================
-- STEP 4. RLS — rebuild around membership (user_company_ids / has_company_role)
-- =============================================================================
-- Enable RLS on the new tables.
ALTER TABLE platform_staff          ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log               ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_prefs      ENABLE ROW LEVEL SECURITY;

-- ---------- employees: PII split (finance/viewer denied base rows) -----------
DROP POLICY IF EXISTS "Company admins delete employees"   ON employees;
DROP POLICY IF EXISTS "Company admins insert employees"   ON employees;
DROP POLICY IF EXISTS "Company admins update employees"   ON employees;
DROP POLICY IF EXISTS "Company members read own employees" ON employees;
DROP POLICY IF EXISTS "Service role employees"            ON employees;
DROP POLICY IF EXISTS "Super admins read all employees"   ON employees;

-- Full-row read: platform staff; owner/admin/hr (all rows); manager (own dept only).
CREATE POLICY "employees_read_full" ON employees FOR SELECT USING (
  public.is_platform_staff() OR (
    company_id IN (SELECT public.user_company_ids()) AND (
      public.has_company_role(company_id, ARRAY['org_owner','org_admin','hr']::public.company_role[])
      OR (
        public.has_company_role(company_id, ARRAY['manager']::public.company_role[])
        AND department = (SELECT d.name FROM public.departments d WHERE d.id = public.user_department_id(company_id))
      )
    )
  )
);
CREATE POLICY "employees_insert" ON employees FOR INSERT WITH CHECK (
  company_id IN (SELECT public.user_company_ids())
  AND public.has_company_role(company_id, ARRAY['org_owner','org_admin','hr']::public.company_role[])
);
CREATE POLICY "employees_update" ON employees FOR UPDATE USING (
  company_id IN (SELECT public.user_company_ids())
  AND public.has_company_role(company_id, ARRAY['org_owner','org_admin','hr']::public.company_role[])
) WITH CHECK (
  company_id IN (SELECT public.user_company_ids())
  AND public.has_company_role(company_id, ARRAY['org_owner','org_admin','hr']::public.company_role[])
);
CREATE POLICY "employees_delete" ON employees FOR DELETE USING (
  company_id IN (SELECT public.user_company_ids())
  AND public.has_company_role(company_id, ARRAY['org_owner','org_admin']::public.company_role[])
);
CREATE POLICY "employees_service_role" ON employees FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- PII-safe view: NO phone / dob_day / dob_month / delivery_address. Readable by
-- ALL members (incl. finance/viewer). security_invoker=false => runs as owner,
-- so the view's own WHERE clause is the access gate (base-table RLS bypassed).
DROP VIEW IF EXISTS employees_safe;
CREATE VIEW employees_safe WITH (security_invoker = false) AS
  SELECT id, company_id, employee_code, full_name, email, department, designation,
         reporting_manager, joining_date, hometown, interests, archetype,
         linkedin_url, dietary_restrictions, gift_preferences, tier, is_active,
         manager_name, manager_email, tshirt_size, dietary_preference, hobbies,
         city, pincode, notes, avatar_url, type, consent_status,
         offboarded_at, purge_after, created_at, updated_at, created_by
    FROM employees e
   WHERE public.is_platform_staff() OR e.company_id IN (SELECT public.user_company_ids());
GRANT SELECT ON employees_safe TO authenticated;

-- ---------- companies --------------------------------------------------------
DROP POLICY IF EXISTS "Company admins update own company" ON companies;
DROP POLICY IF EXISTS "Company members read own company"  ON companies;
DROP POLICY IF EXISTS "Service role full access companies" ON companies;
DROP POLICY IF EXISTS "Super admins read all companies"   ON companies;

CREATE POLICY "companies_read" ON companies FOR SELECT USING (
  public.is_platform_staff() OR id IN (SELECT public.user_company_ids())
);
CREATE POLICY "companies_update" ON companies FOR UPDATE USING (
  id IN (SELECT public.user_company_ids())
  AND public.has_company_role(id, ARRAY['org_owner','org_admin']::public.company_role[])
) WITH CHECK (
  id IN (SELECT public.user_company_ids())
  AND public.has_company_role(id, ARRAY['org_owner','org_admin']::public.company_role[])
);
CREATE POLICY "companies_service_role" ON companies FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ---------- profiles: platform-staff swap ------------------------------------
DROP POLICY IF EXISTS "Super admins read all profiles" ON profiles;
CREATE POLICY "profiles_platform_read" ON profiles FOR SELECT
  USING (public.is_platform_staff());
-- (kept: "Users can read own profile", "Users can update own profile",
--  "Service role full access")

-- Retire the profiles.role-based super-admin helper (replaced by is_platform_staff()).
DROP FUNCTION IF EXISTS public.is_profile_super_admin() CASCADE;

-- ---------- Group A: tenant-managed (read=members, write=owner/admin/hr) ------
-- employee_preferences, gift_records, custom_occasions, company_festivals, reminders
DROP POLICY IF EXISTS "Company access employee_preferences" ON employee_preferences;
DROP POLICY IF EXISTS "Service role employee_preferences"   ON employee_preferences;
DROP POLICY IF EXISTS "Super admin employee_preferences"    ON employee_preferences;
CREATE POLICY "employee_preferences_read" ON employee_preferences FOR SELECT
  USING (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));
CREATE POLICY "employee_preferences_rw" ON employee_preferences FOR ALL
  USING (company_id IN (SELECT public.user_company_ids()) AND public.has_company_role(company_id, ARRAY['org_owner','org_admin','hr']::public.company_role[]))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()) AND public.has_company_role(company_id, ARRAY['org_owner','org_admin','hr']::public.company_role[]));
CREATE POLICY "employee_preferences_service" ON employee_preferences FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Company access gift_records" ON gift_records;
DROP POLICY IF EXISTS "Service role gift_records"   ON gift_records;
DROP POLICY IF EXISTS "Super admin gift_records"    ON gift_records;
CREATE POLICY "gift_records_read" ON gift_records FOR SELECT
  USING (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));
CREATE POLICY "gift_records_rw" ON gift_records FOR ALL
  USING (company_id IN (SELECT public.user_company_ids()) AND public.has_company_role(company_id, ARRAY['org_owner','org_admin','hr']::public.company_role[]))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()) AND public.has_company_role(company_id, ARRAY['org_owner','org_admin','hr']::public.company_role[]));
CREATE POLICY "gift_records_service" ON gift_records FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Company access custom_occasions" ON custom_occasions;
DROP POLICY IF EXISTS "Service role custom_occasions"   ON custom_occasions;
DROP POLICY IF EXISTS "Super admin custom_occasions"    ON custom_occasions;
CREATE POLICY "custom_occasions_read" ON custom_occasions FOR SELECT
  USING (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));
CREATE POLICY "custom_occasions_rw" ON custom_occasions FOR ALL
  USING (company_id IN (SELECT public.user_company_ids()) AND public.has_company_role(company_id, ARRAY['org_owner','org_admin','hr']::public.company_role[]))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()) AND public.has_company_role(company_id, ARRAY['org_owner','org_admin','hr']::public.company_role[]));
CREATE POLICY "custom_occasions_service" ON custom_occasions FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Company access company_festivals" ON company_festivals;
DROP POLICY IF EXISTS "Service role company_festivals"   ON company_festivals;
DROP POLICY IF EXISTS "Super admin company_festivals"    ON company_festivals;
CREATE POLICY "company_festivals_read" ON company_festivals FOR SELECT
  USING (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));
CREATE POLICY "company_festivals_rw" ON company_festivals FOR ALL
  USING (company_id IN (SELECT public.user_company_ids()) AND public.has_company_role(company_id, ARRAY['org_owner','org_admin','hr']::public.company_role[]))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()) AND public.has_company_role(company_id, ARRAY['org_owner','org_admin','hr']::public.company_role[]));
CREATE POLICY "company_festivals_service" ON company_festivals FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Company access reminders" ON reminders;
DROP POLICY IF EXISTS "Service role reminders"   ON reminders;
DROP POLICY IF EXISTS "Super admin reminders"    ON reminders;
CREATE POLICY "reminders_read" ON reminders FOR SELECT
  USING (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));
CREATE POLICY "reminders_rw" ON reminders FOR ALL
  USING (company_id IN (SELECT public.user_company_ids()) AND public.has_company_role(company_id, ARRAY['org_owner','org_admin','hr']::public.company_role[]))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()) AND public.has_company_role(company_id, ARRAY['org_owner','org_admin','hr']::public.company_role[]));
CREATE POLICY "reminders_service" ON reminders FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ---------- Group B: tenant read-only; writes via service role ---------------
-- quotes, orders, invoices, payments
CREATE POLICY "quotes_read" ON quotes FOR SELECT
  USING (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));
CREATE POLICY "quotes_service" ON quotes FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Company read orders" ON orders;
DROP POLICY IF EXISTS "Service role orders" ON orders;
DROP POLICY IF EXISTS "Super admin orders"  ON orders;
CREATE POLICY "orders_read" ON orders FOR SELECT
  USING (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));
CREATE POLICY "orders_service" ON orders FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Company read invoices" ON invoices;
DROP POLICY IF EXISTS "Service role invoices" ON invoices;
DROP POLICY IF EXISTS "Super admin invoices"  ON invoices;
CREATE POLICY "invoices_read" ON invoices FOR SELECT
  USING (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));
CREATE POLICY "invoices_service" ON invoices FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Company read payments" ON payments;
DROP POLICY IF EXISTS "Service role payments" ON payments;
DROP POLICY IF EXISTS "Super admin payments"  ON payments;
CREATE POLICY "payments_read" ON payments FOR SELECT
  USING (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));
CREATE POLICY "payments_service" ON payments FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ---------- Group C: order children (read scoped via parent order) -----------
DROP POLICY IF EXISTS "Company read order_items" ON order_items;
DROP POLICY IF EXISTS "Service role order_items" ON order_items;
DROP POLICY IF EXISTS "Super admin order_items"  ON order_items;
CREATE POLICY "order_items_read" ON order_items FOR SELECT USING (
  public.is_platform_staff() OR order_id IN (
    SELECT id FROM orders WHERE company_id IN (SELECT public.user_company_ids()))
);
CREATE POLICY "order_items_service" ON order_items FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Company read order_recipients" ON order_recipients;
DROP POLICY IF EXISTS "Service role order_recipients" ON order_recipients;
DROP POLICY IF EXISTS "Super admin order_recipients"  ON order_recipients;
CREATE POLICY "order_recipients_read" ON order_recipients FOR SELECT USING (
  public.is_platform_staff() OR order_id IN (
    SELECT id FROM orders WHERE company_id IN (SELECT public.user_company_ids()))
);
CREATE POLICY "order_recipients_service" ON order_recipients FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Company read order_status_history" ON order_status_history;
DROP POLICY IF EXISTS "Service role order_status_history" ON order_status_history;
DROP POLICY IF EXISTS "Super admin order_status_history"  ON order_status_history;
CREATE POLICY "order_status_history_read" ON order_status_history FOR SELECT USING (
  public.is_platform_staff() OR order_id IN (
    SELECT id FROM orders WHERE company_id IN (SELECT public.user_company_ids()))
);
CREATE POLICY "order_status_history_service" ON order_status_history FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ---------- Platform + membership tables -------------------------------------
CREATE POLICY "platform_staff_read" ON platform_staff FOR SELECT
  USING (public.is_platform_staff());
CREATE POLICY "platform_staff_manage" ON platform_staff FOR ALL
  USING (public.platform_role_of() = ANY (ARRAY['owner','admin']::public.platform_role[]))
  WITH CHECK (public.platform_role_of() = ANY (ARRAY['owner','admin']::public.platform_role[]));
CREATE POLICY "platform_staff_service" ON platform_staff FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "company_members_read" ON company_members FOR SELECT
  USING (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));
CREATE POLICY "company_members_manage" ON company_members FOR ALL
  USING (company_id IN (SELECT public.user_company_ids()) AND public.has_company_role(company_id, ARRAY['org_owner','org_admin']::public.company_role[]))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()) AND public.has_company_role(company_id, ARRAY['org_owner','org_admin']::public.company_role[]));
CREATE POLICY "company_members_service" ON company_members FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "departments_read" ON departments FOR SELECT
  USING (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));
CREATE POLICY "departments_manage" ON departments FOR ALL
  USING (company_id IN (SELECT public.user_company_ids()) AND public.has_company_role(company_id, ARRAY['org_owner','org_admin']::public.company_role[]))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()) AND public.has_company_role(company_id, ARRAY['org_owner','org_admin']::public.company_role[]));
CREATE POLICY "departments_service" ON departments FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "invites_read" ON invites FOR SELECT USING (
  public.is_platform_staff() OR (company_id IN (SELECT public.user_company_ids())
    AND public.has_company_role(company_id, ARRAY['org_owner','org_admin']::public.company_role[]))
);
CREATE POLICY "invites_manage" ON invites FOR ALL
  USING (company_id IN (SELECT public.user_company_ids()) AND public.has_company_role(company_id, ARRAY['org_owner','org_admin']::public.company_role[]))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()) AND public.has_company_role(company_id, ARRAY['org_owner','org_admin']::public.company_role[]));
CREATE POLICY "invites_service" ON invites FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ---------- audit_log: READ only (append-only enforced by trigger) -----------
-- Deliberately NO insert/update/delete policy for authenticated. Inserts happen
-- via the service role (which bypasses RLS); UPDATE/DELETE are blocked for
-- EVERYONE (incl. service role / table owner) by trg_audit_log_no_update.
CREATE POLICY "audit_log_read" ON audit_log FOR SELECT
  USING (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));

-- ---------- impersonation_sessions: platform staff only ----------------------
CREATE POLICY "impersonation_platform" ON impersonation_sessions FOR ALL
  USING (public.is_platform_staff()) WITH CHECK (public.is_platform_staff());
CREATE POLICY "impersonation_service" ON impersonation_sessions FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ---------- notifications + prefs (owned by the recipient) -------------------
CREATE POLICY "notifications_read" ON notifications FOR SELECT
  USING (recipient_user_id = auth.uid() OR public.is_platform_staff());
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  USING (recipient_user_id = auth.uid()) WITH CHECK (recipient_user_id = auth.uid());
CREATE POLICY "notifications_service" ON notifications FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "notification_prefs_own" ON notification_prefs FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notification_prefs_service" ON notification_prefs FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ---------- Internal CRM: platform staff only --------------------------------
DROP POLICY IF EXISTS "Super admin leads"   ON leads;
DROP POLICY IF EXISTS "Service role leads"  ON leads;
CREATE POLICY "leads_platform" ON leads FOR ALL
  USING (public.is_platform_staff()) WITH CHECK (public.is_platform_staff());
CREATE POLICY "leads_service" ON leads FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Super admin lead_activities"  ON lead_activities;
DROP POLICY IF EXISTS "Service role lead_activities" ON lead_activities;
CREATE POLICY "lead_activities_platform" ON lead_activities FOR ALL
  USING (public.is_platform_staff()) WITH CHECK (public.is_platform_staff());
CREATE POLICY "lead_activities_service" ON lead_activities FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Super admin lead_status_history"  ON lead_status_history;
DROP POLICY IF EXISTS "Service role lead_status_history" ON lead_status_history;
CREATE POLICY "lead_status_history_platform" ON lead_status_history FOR ALL
  USING (public.is_platform_staff()) WITH CHECK (public.is_platform_staff());
CREATE POLICY "lead_status_history_service" ON lead_status_history FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ---------- blog_posts + email_log (platform-staff swap) ---------------------
DROP POLICY IF EXISTS "Super admin blog_posts"      ON blog_posts;
DROP POLICY IF EXISTS "Service role blog_posts"     ON blog_posts;
DROP POLICY IF EXISTS "Public read published posts" ON blog_posts;
CREATE POLICY "blog_posts_public_read" ON blog_posts FOR SELECT
  USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));
CREATE POLICY "blog_posts_platform_manage" ON blog_posts FOR ALL
  USING (public.is_platform_staff()) WITH CHECK (public.is_platform_staff());
CREATE POLICY "blog_posts_service" ON blog_posts FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Super admin email_log"  ON email_log;
DROP POLICY IF EXISTS "Service role email_log" ON email_log;
CREATE POLICY "email_log_platform_read" ON email_log FOR SELECT
  USING (public.is_platform_staff());
CREATE POLICY "email_log_service" ON email_log FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- Hardening: pin search_path on the new trigger functions (advisor 0011).
-- employees_safe is intentionally a SECURITY DEFINER view (advisor 0010) — that
-- is the mechanism that lets finance/viewer read safe columns while base-table
-- RLS denies them PII. gift_history/kits/kit_items/quote_items/recommendation_logs
-- are dead legacy tables left RLS-on with NO policy (deny-all) on purpose.
-- =============================================================================
ALTER FUNCTION public.set_purge_after()          SET search_path = '';
ALTER FUNCTION public.audit_log_is_append_only() SET search_path = '';
COMMENT ON VIEW employees_safe IS
  'PII-safe projection of employees (no phone/dob_day/dob_month/delivery_address). '
  'SECURITY DEFINER by design: enforces its own membership WHERE so finance/viewer '
  'can read safe columns while base-table RLS denies them the PII columns.';
