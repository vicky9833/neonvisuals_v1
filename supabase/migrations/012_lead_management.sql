-- ============================================================
-- 012_lead_management.sql — Lead Management + CRM (Prompt 14)
-- ============================================================
-- IMPORTANT — READ BEFORE APPLYING:
-- Migration 001 created legacy `leads` and `lead_activities` tables for the
-- superseded org/user data model (org-scoped, `converted_org_id`, enum-typed
-- source/status, occasion_interest occasion_type[]). The platform has since
-- moved to the company/profile model. This migration replaces them with the
-- richer company-aware CRM described in Prompt 14.
--
-- These legacy tables are UNUSED (no application code references them). Confirm
-- with:  SELECT count(*) FROM leads;  SELECT count(*) FROM lead_activities;
-- (expect 0). The DROP ... CASCADE below also removes the legacy RLS policies
-- from migration 002. Destructive but safe on the empty legacy tables.
-- ============================================================

DROP TABLE IF EXISTS lead_activities CASCADE;
DROP TABLE IF EXISTS lead_status_history CASCADE;
DROP TABLE IF EXISTS leads CASCADE;

-- ============================================================
-- Leads
-- ============================================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact info
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  contact_designation TEXT,

  -- Company info
  company_name TEXT NOT NULL,
  company_industry TEXT,
  company_size TEXT, -- '10-50', '50-200', '200-500', '500-1000', '1000+'
  company_city TEXT DEFAULT 'Bangalore',
  company_website TEXT,

  -- Pipeline
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost', 'dormant'
  )),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('hot', 'warm', 'medium', 'cold')),

  -- Source
  source TEXT NOT NULL DEFAULT 'website' CHECK (source IN (
    'whatsapp', 'website', 'gift_builder', 'linkedin', 'referral', 'event', 'cold_outreach', 'google', 'instagram', 'other'
  )),
  source_detail TEXT,

  -- Opportunity
  estimated_order_value NUMERIC,
  estimated_kit_count INTEGER,
  interested_collections TEXT[],
  interested_occasions TEXT[],

  -- Conversion
  company_id UUID REFERENCES companies(id),
  first_quote_id UUID REFERENCES quotes(id),
  first_order_id UUID REFERENCES orders(id),
  converted_date TIMESTAMPTZ,

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),

  -- Follow-up
  next_follow_up_date DATE,
  next_follow_up_note TEXT,
  last_contacted_date TIMESTAMPTZ,

  -- Scoring
  lead_score INTEGER DEFAULT 0,

  -- Loss reason (if status = 'lost')
  loss_reason TEXT,
  loss_notes TEXT,

  -- Meta
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Lead activities (CRM activity log)
-- ============================================================
CREATE TABLE lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'note', 'call', 'whatsapp', 'email', 'meeting', 'proposal', 'follow_up',
    'sample_sent', 'status_change', 'quote_created', 'order_placed', 'other'
  )),

  title TEXT NOT NULL,
  description TEXT,

  outcome TEXT, -- 'positive', 'neutral', 'negative', 'no_answer', 'rescheduled'

  quote_id UUID REFERENCES quotes(id),

  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT now(),

  follow_up_date DATE,
  follow_up_note TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Lead status history
-- ============================================================
CREATE TABLE lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(next_follow_up_date);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead ON lead_status_history(lead_id);

-- ============================================================
-- RLS — admin only (leads are internal; no company-scoped access)
-- ============================================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin leads" ON leads;
CREATE POLICY "Super admin leads" ON leads FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
DROP POLICY IF EXISTS "Service role leads" ON leads;
CREATE POLICY "Service role leads" ON leads FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Super admin lead_activities" ON lead_activities;
CREATE POLICY "Super admin lead_activities" ON lead_activities FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
DROP POLICY IF EXISTS "Service role lead_activities" ON lead_activities;
CREATE POLICY "Service role lead_activities" ON lead_activities FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Super admin lead_status_history" ON lead_status_history;
CREATE POLICY "Super admin lead_status_history" ON lead_status_history FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));
DROP POLICY IF EXISTS "Service role lead_status_history" ON lead_status_history;
CREATE POLICY "Service role lead_status_history" ON lead_status_history FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- updated_at trigger (shared set_updated_at() from migration 001)
-- ============================================================
DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
