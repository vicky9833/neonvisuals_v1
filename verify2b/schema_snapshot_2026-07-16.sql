-- ============================================================================
-- schema_snapshot_2026-07-16.sql  — Prompt 2b Phase 2 (CONTRACT) safety snapshot
-- ============================================================================
-- Full DDL of every object Phase 2 retires via RENAME (deprecate-don't-destroy).
-- Captured read-only from live project xserhblhiwtmaiejbvgo (Postgres 17.6) on
-- 2026-07-16, BEFORE any rename. This file is the authoritative restore source
-- if a rename-back is ever insufficient (e.g. a later true-DROP housekeeping pass
-- needs to recreate structure). Reality matched recon R2/R4 exactly.
--
-- NOTE: All 5 dead tables are 0-row; quotes has 1 row with kit_id IS NULL.
-- No data is destroyed by Phase 2 — objects are renamed, not dropped.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- C1 target: profiles.role (+ check constraint + index)
-- ----------------------------------------------------------------------------
-- Column:      role text NOT NULL DEFAULT 'client'::text
-- Restore col: ALTER TABLE public.profiles RENAME COLUMN _deprecated_role TO role;
ALTER TABLE public.profiles
  ADD COLUMN role text NOT NULL DEFAULT 'client'::text;   -- (recreate form, if ever needed)
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK ((role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'client'::text])));
CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);

-- ----------------------------------------------------------------------------
-- C2 target: quotes.kit_id (+ FK)
-- ----------------------------------------------------------------------------
-- Column:      kit_id uuid NULL (no default)
-- FK:          quotes_kit_id_fkey FOREIGN KEY (kit_id) REFERENCES kits(id) ON DELETE SET NULL
-- Restore:     ALTER TABLE public.quotes RENAME COLUMN _deprecated_kit_id TO kit_id;
--              ALTER TABLE public.quotes ADD CONSTRAINT quotes_kit_id_fkey
--                FOREIGN KEY (kit_id) REFERENCES kits(id) ON DELETE SET NULL;
ALTER TABLE public.quotes ADD COLUMN kit_id uuid;         -- (recreate form, if ever needed)
ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_kit_id_fkey FOREIGN KEY (kit_id) REFERENCES kits(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- C3 targets: the 5 dead tables (all 0-row; RLS ENABLED, ZERO policies)
-- Restore each: ALTER TABLE public._deprecated_<name> RENAME TO <name>;
-- ----------------------------------------------------------------------------

-- ===== kits =====
CREATE TABLE public.kits (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  created_by uuid,
  name text NOT NULL,
  description text,
  occasion occasion_type,
  packaging_tier packaging_tier DEFAULT 'standard'::packaging_tier,
  is_template boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT false,
  total_cogs integer,
  total_price integer,
  image_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.kits ADD CONSTRAINT kits_pkey PRIMARY KEY (id);
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_kits_updated_at BEFORE UPDATE ON public.kits FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===== kit_items =====
CREATE TABLE public.kit_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  kit_id uuid NOT NULL,
  product_id uuid,
  quantity integer NOT NULL DEFAULT 1,
  sort_order integer DEFAULT 0,
  personalization_preview jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.kit_items ADD CONSTRAINT kit_items_pkey PRIMARY KEY (id);
ALTER TABLE public.kit_items ADD CONSTRAINT kit_items_kit_id_fkey FOREIGN KEY (kit_id) REFERENCES kits(id) ON DELETE CASCADE;
ALTER TABLE public.kit_items ADD CONSTRAINT kit_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE public.kit_items ENABLE ROW LEVEL SECURITY;

-- ===== quote_items =====
CREATE TABLE public.quote_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  quote_id uuid NOT NULL,
  product_id uuid,
  description text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price integer,
  total_price integer,
  personalization_details jsonb,
  sort_order integer DEFAULT 0
);
ALTER TABLE public.quote_items ADD CONSTRAINT quote_items_pkey PRIMARY KEY (id);
ALTER TABLE public.quote_items ADD CONSTRAINT quote_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE;
ALTER TABLE public.quote_items ADD CONSTRAINT quote_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- ===== gift_history =====
CREATE TABLE public.gift_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  employee_id uuid,
  order_id uuid,
  order_item_id uuid,
  product_id uuid,
  occasion occasion_type,
  occasion_date date,
  gift_year integer,
  product_name text,
  product_sku text,
  kit_name text,
  archetype_at_time employee_archetype,
  narrative_card_text text,
  personalization_summary text,
  recipient_reaction text,
  desk_test_status text,
  photo_url text,
  linkedin_posted boolean NOT NULL DEFAULT false,
  instagram_posted boolean NOT NULL DEFAULT false,
  intelligence_notes text,
  do_not_repeat boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.gift_history ADD CONSTRAINT gift_history_pkey PRIMARY KEY (id);
ALTER TABLE public.gift_history ADD CONSTRAINT gift_history_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
ALTER TABLE public.gift_history ADD CONSTRAINT gift_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
CREATE INDEX idx_gift_history_employee_id ON public.gift_history USING btree (employee_id);
CREATE INDEX idx_gift_history_org_id ON public.gift_history USING btree (org_id);
ALTER TABLE public.gift_history ENABLE ROW LEVEL SECURITY;

-- ===== recommendation_logs =====
CREATE TABLE public.recommendation_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  org_id uuid,
  employee_id uuid,
  occasion occasion_type,
  archetype employee_archetype,
  budget_range text,
  recommended_products uuid[],
  selected_product uuid,
  was_helpful boolean,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.recommendation_logs ADD CONSTRAINT recommendation_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.recommendation_logs ADD CONSTRAINT recommendation_logs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE public.recommendation_logs ADD CONSTRAINT recommendation_logs_selected_product_fkey FOREIGN KEY (selected_product) REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE public.recommendation_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Dead-table policies: NONE (all 5 have RLS enabled with ZERO policies).
-- Dead-table triggers: only kits.trg_kits_updated_at (captured above).
-- ============================================================================
