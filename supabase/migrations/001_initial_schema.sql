-- =============================================================================
-- Neon Visuals — Initial Schema (001)
-- Multi-tenant employee experience / corporate gifting platform.
-- NOTE: Vendor management is handled OFFLINE — no vendor tables here.
-- Prices are stored for INTERNAL use only (quotes, admin, billing) and are
-- never exposed on the public marketing site.
-- =============================================================================

-- ---------- Extensions -------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ---------- Enums ------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('super_admin', 'org_admin', 'org_manager', 'org_viewer');
CREATE TYPE org_plan AS ENUM ('starter', 'growth', 'enterprise');
CREATE TYPE bucket_code AS ENUM ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H');
CREATE TYPE product_status AS ENUM ('active', 'draft', 'archived');
CREATE TYPE packaging_tier AS ENUM ('budget', 'standard', 'premium', 'flagship');
CREATE TYPE personalization_type AS ENUM (
  'laser_engrave', 'print', 'emboss', 'deboss', 'sublimation', 'dtf',
  'embroidery', 'uv_print'
);
CREATE TYPE quote_status AS ENUM (
  'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted'
);
CREATE TYPE order_status AS ENUM (
  'pending', 'confirmed', 'in_production', 'quality_check', 'packing',
  'dispatched', 'delivered', 'completed'
);
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid', 'overdue', 'refunded');
CREATE TYPE payment_method AS ENUM ('razorpay', 'bank_transfer', 'cheque', 'credit_terms');
CREATE TYPE payment_terms AS ENUM ('advance_100', 'advance_50', 'net_15', 'net_30', 'net_60');
CREATE TYPE lead_status AS ENUM (
  'new', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'won',
  'lost', 'dormant'
);
CREATE TYPE lead_source AS ENUM (
  'website', 'linkedin', 'referral', 'event', 'cold_outreach', 'inbound_call',
  'whatsapp', 'google', 'instagram', 'other'
);
CREATE TYPE occasion_type AS ENUM (
  'onboarding', 'birthday', 'work_anniversary_1', 'work_anniversary_3',
  'work_anniversary_5', 'work_anniversary_7', 'work_anniversary_10',
  'work_anniversary_15', 'work_anniversary_20', 'promotion', 'spot_award',
  'quarterly_mvp', 'annual_award', 'farewell', 'retirement', 'new_parent',
  'wedding', 'festival_diwali', 'festival_holi', 'festival_christmas',
  'festival_eid', 'festival_pongal', 'festival_onam', 'new_year',
  'company_anniversary', 'team_offsite', 'client_appreciation',
  'deal_closure', 'custom'
);
CREATE TYPE employee_archetype AS ENUM (
  'achiever', 'creator', 'explorer', 'builder', 'root', 'connector',
  'scholar', 'minimalist'
);
CREATE TYPE blog_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE notification_type AS ENUM (
  'occasion_reminder', 'order_update', 'quote_expiry', 'payment_reminder',
  'delivery_confirmation', 'system'
);
CREATE TYPE reminder_frequency AS ENUM ('7_days', '3_days', '1_day', 'same_day');

-- ---------- Tables -----------------------------------------------------------

-- 1. organizations — multi-tenant root
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  domain TEXT,
  industry TEXT,
  company_size TEXT,
  logo_url TEXT,
  plan org_plan NOT NULL DEFAULT 'starter',
  billing_email TEXT,
  billing_address JSONB,
  payment_terms payment_terms DEFAULT 'advance_50',
  settings JSONB DEFAULT '{}'::jsonb,
  onboarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. users — platform users (HR/Admin)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'org_admin',
  designation TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. employees — gift recipients (NOT platform users)
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_code TEXT,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT,
  designation TEXT,
  reporting_manager TEXT,
  joining_date DATE,
  birthday DATE,
  hometown TEXT,
  interests TEXT[],
  archetype employee_archetype,
  archetype_signals JSONB,
  linkedin_url TEXT,
  profile_notes TEXT,
  dietary_restrictions TEXT,
  gift_preferences TEXT,
  tier TEXT DEFAULT 'standard',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. buckets — 8 product categories (A–H)
CREATE TABLE buckets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code bucket_code UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  purpose TEXT,
  primary_buyer TEXT,
  asp_range_min INT,
  asp_range_max INT,
  icon TEXT,
  image_url TEXT,
  sort_order INT DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. products — all SKUs (prices are INTERNAL only)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT UNIQUE NOT NULL,
  bucket_id UUID REFERENCES buckets(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  tagline TEXT,
  description TEXT,
  long_description TEXT,
  who_is_it_for TEXT,
  insight TEXT,
  wow_score INT CHECK (wow_score BETWEEN 1 AND 10),
  cogs INT,
  price_single INT,
  price_bulk_25 INT,
  price_bulk_100 INT,
  margin_percent NUMERIC,
  lead_time_days INT,
  rush_lead_time_days INT,
  moq INT,
  materials TEXT[],
  personalization_options JSONB,
  personalization_types personalization_type[],
  images TEXT[],
  thumbnail_url TEXT,
  video_url TEXT,
  dimensions JSONB,
  recommended_packaging packaging_tier,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  tags TEXT[],
  occasions occasion_type[],
  archetypes employee_archetype[],
  status product_status NOT NULL DEFAULT 'active',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_bestseller BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. kits — saved gift combinations
CREATE TABLE kits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  occasion occasion_type,
  packaging_tier packaging_tier DEFAULT 'standard',
  is_template BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  total_cogs INT,
  total_price INT,
  image_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. kit_items
CREATE TABLE kit_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kit_id UUID NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INT NOT NULL DEFAULT 1,
  sort_order INT DEFAULT 0,
  personalization_preview JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. quotes
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_number TEXT UNIQUE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  kit_id UUID REFERENCES kits(id) ON DELETE SET NULL,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_company TEXT,
  subtotal INT,
  gst_percent NUMERIC DEFAULT 18,
  gst_amount INT,
  discount_percent NUMERIC DEFAULT 0,
  discount_amount INT DEFAULT 0,
  rush_surcharge INT DEFAULT 0,
  custom_design_fee INT DEFAULT 0,
  packaging_cost INT DEFAULT 0,
  shipping_cost INT DEFAULT 0,
  total_amount INT,
  quantity INT DEFAULT 1,
  payment_terms payment_terms DEFAULT 'advance_50',
  valid_until DATE,
  notes TEXT,
  internal_notes TEXT,
  status quote_status NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_reason TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. quote_items
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  description TEXT,
  quantity INT NOT NULL DEFAULT 1,
  unit_price INT,
  total_price INT,
  personalization_details JSONB,
  sort_order INT DEFAULT 0
);

-- 10. orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  placed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  subtotal INT,
  gst_amount INT,
  discount_amount INT DEFAULT 0,
  rush_surcharge INT DEFAULT 0,
  custom_design_fee INT DEFAULT 0,
  packaging_cost INT DEFAULT 0,
  shipping_cost INT DEFAULT 0,
  total_amount INT,
  status order_status NOT NULL DEFAULT 'pending',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_method payment_method,
  expected_delivery DATE,
  actual_delivery DATE,
  production_start DATE,
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  shipping_address JSONB,
  tracking_number TEXT,
  courier_partner TEXT,
  photo_proof_urls TEXT[],
  delivery_proof_url TEXT,
  notes TEXT,
  internal_notes TEXT,
  special_instructions TEXT,
  client_rating INT CHECK (client_rating BETWEEN 1 AND 5),
  client_feedback TEXT,
  desk_test_score INT CHECK (desk_test_score BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. order_items — per-employee items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price INT,
  total_price INT,
  personalization_data JSONB,
  narrative_card_text TEXT,
  archetype_at_time employee_archetype,
  production_status TEXT DEFAULT 'pending',
  qc_passed BOOLEAN,
  qc_notes TEXT,
  photo_proof_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. occasions — computed + custom events
CREATE TABLE occasions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  occasion_type occasion_type NOT NULL,
  title TEXT,
  date DATE NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,
  suggested_products UUID[],
  assigned_kit_id UUID REFERENCES kits(id) ON DELETE SET NULL,
  budget_min INT,
  budget_max INT,
  is_acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_gift_ordered BOOLEAN NOT NULL DEFAULT false,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  reminder_30_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_7_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_3_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_1_sent BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. festival_calendar — global festivals
CREATE TABLE festival_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  occasion_type occasion_type,
  date DATE NOT NULL,
  year INT,
  description TEXT,
  recommended_buckets bucket_code[],
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 14. gift_history — the memory database (SACRED DATA)
CREATE TABLE gift_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  occasion occasion_type,
  occasion_date DATE,
  gift_year INT,
  product_name TEXT,
  product_sku TEXT,
  kit_name TEXT,
  archetype_at_time employee_archetype,
  narrative_card_text TEXT,
  personalization_summary TEXT,
  recipient_reaction TEXT,
  desk_test_status TEXT,
  photo_url TEXT,
  linkedin_posted BOOLEAN NOT NULL DEFAULT false,
  instagram_posted BOOLEAN NOT NULL DEFAULT false,
  intelligence_notes TEXT,
  do_not_repeat BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. leads — CRM
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  company_size TEXT,
  designation TEXT,
  source lead_source,
  source_detail TEXT,
  status lead_status NOT NULL DEFAULT 'new',
  budget_range TEXT,
  occasion_interest occasion_type[],
  employee_count INT,
  timeline TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  priority INT NOT NULL DEFAULT 0,
  last_contacted_at TIMESTAMPTZ,
  next_follow_up DATE,
  follow_up_notes TEXT,
  converted_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  lost_reason TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. lead_activities — interaction log
CREATE TABLE lead_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT,
  description TEXT,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. invoices — GST-compliant
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  subtotal INT,
  gst_percent NUMERIC DEFAULT 18,
  gst_amount INT,
  discount_amount INT DEFAULT 0,
  total_amount INT,
  amount_paid INT DEFAULT 0,
  amount_due INT,
  billing_address JSONB,
  line_items JSONB,
  payment_terms payment_terms DEFAULT 'advance_50',
  due_date DATE,
  notes TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  razorpay_invoice_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. payments — transaction log
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  payment_method payment_method,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  reference_number TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. blog_posts — content CMS
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT,
  featured_image TEXT,
  author_name TEXT DEFAULT 'Neon Visuals',
  author_avatar TEXT,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  canonical_url TEXT,
  category TEXT,
  tags TEXT[],
  related_products UUID[],
  related_occasions occasion_type[],
  status blog_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  reading_time_minutes INT,
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 20. notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 21. page_views — analytics
CREATE TABLE page_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_path TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  session_id TEXT,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 22. recommendation_logs — engine improvement data
CREATE TABLE recommendation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  occasion occasion_type,
  archetype employee_archetype,
  budget_range TEXT,
  recommended_products UUID[],
  selected_product UUID REFERENCES products(id) ON DELETE SET NULL,
  was_helpful BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Indexes ----------------------------------------------------------
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_auth_id ON users(auth_id);

CREATE INDEX idx_employees_org_id ON employees(org_id);
CREATE INDEX idx_employees_full_name_trgm ON employees USING gin (full_name gin_trgm_ops);
CREATE INDEX idx_employees_joining_date ON employees(joining_date);
CREATE INDEX idx_employees_birthday ON employees(birthday);

CREATE INDEX idx_products_bucket_id ON products(bucket_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_occasions ON products USING gin (occasions);
CREATE INDEX idx_products_tags ON products USING gin (tags);

CREATE INDEX idx_quotes_org_id ON quotes(org_id);
CREATE INDEX idx_quotes_status ON quotes(status);

CREATE INDEX idx_orders_org_id ON orders(org_id);
CREATE INDEX idx_orders_status ON orders(status);

CREATE INDEX idx_occasions_org_id ON occasions(org_id);
CREATE INDEX idx_occasions_date ON occasions(date);
CREATE INDEX idx_occasions_employee_id ON occasions(employee_id);

CREATE INDEX idx_gift_history_employee_id ON gift_history(employee_id);
CREATE INDEX idx_gift_history_org_id ON gift_history(org_id);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);

CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);

CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);

CREATE INDEX idx_invoices_org_id ON invoices(org_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ---------- Triggers & Functions --------------------------------------------

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizations', 'users', 'employees', 'kits', 'quotes', 'orders',
    'occasions', 'leads', 'invoices', 'blog_posts', 'products'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t, t
    );
  END LOOP;
END;
$$;

-- Sequential document numbers: NV-<PREFIX>-YYYY-NNNN
CREATE OR REPLACE FUNCTION generate_document_number(prefix TEXT, tbl TEXT, col TEXT)
RETURNS TEXT AS $$
DECLARE
  yr TEXT := to_char(now(), 'YYYY');
  seq INT;
  result TEXT;
BEGIN
  EXECUTE format(
    'SELECT COALESCE(MAX((regexp_replace(%I, ''^.*-'', ''''))::INT), 0) + 1
     FROM %I WHERE %I LIKE %L',
    col, tbl, col, 'NV-' || prefix || '-' || yr || '-%'
  ) INTO seq;
  result := 'NV-' || prefix || '-' || yr || '-' || lpad(seq::TEXT, 4, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quote_number IS NULL THEN
    NEW.quote_number := generate_document_number('Q', 'quotes', 'quote_number');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_quote_number BEFORE INSERT ON quotes
  FOR EACH ROW EXECUTE FUNCTION set_quote_number();

CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := generate_document_number('O', 'orders', 'order_number');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_order_number BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION set_order_number();

CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_document_number('INV', 'invoices', 'invoice_number');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_invoice_number BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_invoice_number();

-- Compute birthday + work-anniversary occasions for an org & year
CREATE OR REPLACE FUNCTION compute_employee_occasions(p_org_id UUID, p_year INT)
RETURNS INT AS $$
DECLARE
  emp RECORD;
  created_count INT := 0;
  years_served INT;
  anniversary_type occasion_type;
  bday DATE;
  anniv DATE;
BEGIN
  FOR emp IN
    SELECT * FROM employees WHERE org_id = p_org_id AND is_active = true
  LOOP
    -- Birthday
    IF emp.birthday IS NOT NULL THEN
      bday := make_date(p_year, EXTRACT(MONTH FROM emp.birthday)::INT, EXTRACT(DAY FROM emp.birthday)::INT);
      IF NOT EXISTS (
        SELECT 1 FROM occasions
        WHERE employee_id = emp.id AND occasion_type = 'birthday' AND date = bday
      ) THEN
        INSERT INTO occasions (org_id, employee_id, occasion_type, title, date, is_recurring)
        VALUES (p_org_id, emp.id, 'birthday', emp.full_name || '''s Birthday', bday, true);
        created_count := created_count + 1;
      END IF;
    END IF;

    -- Work anniversary (only for milestone years 1,3,5,7,10,15,20)
    IF emp.joining_date IS NOT NULL THEN
      years_served := p_year - EXTRACT(YEAR FROM emp.joining_date)::INT;
      anniversary_type := CASE years_served
        WHEN 1 THEN 'work_anniversary_1'::occasion_type
        WHEN 3 THEN 'work_anniversary_3'::occasion_type
        WHEN 5 THEN 'work_anniversary_5'::occasion_type
        WHEN 7 THEN 'work_anniversary_7'::occasion_type
        WHEN 10 THEN 'work_anniversary_10'::occasion_type
        WHEN 15 THEN 'work_anniversary_15'::occasion_type
        WHEN 20 THEN 'work_anniversary_20'::occasion_type
        ELSE NULL
      END;

      IF anniversary_type IS NOT NULL THEN
        anniv := make_date(p_year, EXTRACT(MONTH FROM emp.joining_date)::INT, EXTRACT(DAY FROM emp.joining_date)::INT);
        IF NOT EXISTS (
          SELECT 1 FROM occasions
          WHERE employee_id = emp.id AND occasion_type = anniversary_type AND date = anniv
        ) THEN
          INSERT INTO occasions (org_id, employee_id, occasion_type, title, date, is_recurring)
          VALUES (p_org_id, emp.id, anniversary_type,
                  emp.full_name || ' — ' || years_served || ' Year Anniversary', anniv, false);
          created_count := created_count + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN created_count;
END;
$$ LANGUAGE plpgsql;

-- ---------- Row Level Security ----------------------------------------------

-- SECURITY DEFINER helpers (bypass RLS to avoid recursion)
CREATE OR REPLACE FUNCTION auth_org_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT org_id FROM users WHERE auth_id = auth.uid() LIMIT 1 $$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM users WHERE auth_id = auth.uid() AND role = 'super_admin'
) $$;

-- Public-readable catalogue content
ALTER TABLE buckets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buckets are public" ON buckets FOR SELECT USING (true);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- NOTE: price columns live here for internal use. The public site reads from
-- static data files (no prices); price protection is enforced at the app layer.
CREATE POLICY "Products are public" ON products FOR SELECT USING (true);

ALTER TABLE festival_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Festivals are public" ON festival_calendar FOR SELECT USING (true);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published posts are public" ON blog_posts
  FOR SELECT USING (status = 'published' OR is_super_admin());
CREATE POLICY "Admins manage posts" ON blog_posts
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Tenant-scoped tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own organization" ON organizations
  FOR ALL USING (id = auth_org_id() OR is_super_admin())
  WITH CHECK (id = auth_org_id() OR is_super_admin());

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own org users" ON users
  FOR SELECT USING (org_id = auth_org_id() OR auth_id = auth.uid() OR is_super_admin());
CREATE POLICY "Manage own org users" ON users
  FOR ALL USING (org_id = auth_org_id() OR is_super_admin())
  WITH CHECK (org_id = auth_org_id() OR is_super_admin());

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own org employees" ON employees
  FOR ALL USING (org_id = auth_org_id() OR is_super_admin())
  WITH CHECK (org_id = auth_org_id() OR is_super_admin());

ALTER TABLE kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own org kits" ON kits
  FOR ALL USING (org_id = auth_org_id() OR is_template OR is_super_admin())
  WITH CHECK (org_id = auth_org_id() OR is_super_admin());

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own org quotes" ON quotes
  FOR ALL USING (org_id = auth_org_id() OR is_super_admin())
  WITH CHECK (org_id = auth_org_id() OR is_super_admin());

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own org orders" ON orders
  FOR ALL USING (org_id = auth_org_id() OR is_super_admin())
  WITH CHECK (org_id = auth_org_id() OR is_super_admin());

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own org order items" ON order_items
  FOR ALL USING (
    is_super_admin() OR EXISTS (
      SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.org_id = auth_org_id()
    )
  )
  WITH CHECK (
    is_super_admin() OR EXISTS (
      SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.org_id = auth_org_id()
    )
  );

ALTER TABLE occasions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own org occasions" ON occasions
  FOR ALL USING (org_id = auth_org_id() OR is_super_admin())
  WITH CHECK (org_id = auth_org_id() OR is_super_admin());

ALTER TABLE gift_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own org gift history" ON gift_history
  FOR ALL USING (org_id = auth_org_id() OR is_super_admin())
  WITH CHECK (org_id = auth_org_id() OR is_super_admin());

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own org invoices" ON invoices
  FOR ALL USING (org_id = auth_org_id() OR is_super_admin())
  WITH CHECK (org_id = auth_org_id() OR is_super_admin());

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own org payments" ON payments
  FOR ALL USING (org_id = auth_org_id() OR is_super_admin())
  WITH CHECK (org_id = auth_org_id() OR is_super_admin());

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications" ON notifications
  FOR ALL USING (
    is_super_admin() OR user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  )
  WITH CHECK (
    is_super_admin() OR user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- =============================================================================
-- End of migration 001
-- =============================================================================
