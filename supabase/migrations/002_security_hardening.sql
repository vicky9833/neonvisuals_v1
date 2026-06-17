-- =============================================================================
-- 002 Security hardening
-- Enable RLS on remaining public tables, add policies, pin function search_path.
-- =============================================================================

-- kit_items: scoped via parent kit
ALTER TABLE kit_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own org kit items" ON kit_items FOR ALL USING (
  is_super_admin() OR EXISTS (
    SELECT 1 FROM kits k
    WHERE k.id = kit_items.kit_id AND (k.org_id = auth_org_id() OR k.is_template)
  )
) WITH CHECK (
  is_super_admin() OR EXISTS (
    SELECT 1 FROM kits k WHERE k.id = kit_items.kit_id AND k.org_id = auth_org_id()
  )
);

-- quote_items: scoped via parent quote
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own org quote items" ON quote_items FOR ALL USING (
  is_super_admin() OR EXISTS (
    SELECT 1 FROM quotes q WHERE q.id = quote_items.quote_id AND q.org_id = auth_org_id()
  )
) WITH CHECK (
  is_super_admin() OR EXISTS (
    SELECT 1 FROM quotes q WHERE q.id = quote_items.quote_id AND q.org_id = auth_org_id()
  )
);

-- leads & lead_activities: internal CRM, super_admin only.
-- Public lead submissions are inserted server-side via the service role.
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage leads" ON leads
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage lead activities" ON lead_activities
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- recommendation_logs: org-scoped
ALTER TABLE recommendation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own org recommendation logs" ON recommendation_logs
  FOR ALL USING (org_id = auth_org_id() OR is_super_admin())
  WITH CHECK (org_id = auth_org_id() OR is_super_admin());

-- page_views: anyone may insert analytics; only super_admin may read.
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log page views" ON page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read page views" ON page_views FOR SELECT USING (is_super_admin());

-- Pin search_path on remaining functions
ALTER FUNCTION set_updated_at() SET search_path = public;
ALTER FUNCTION generate_document_number(text, text, text) SET search_path = public;
ALTER FUNCTION set_quote_number() SET search_path = public;
ALTER FUNCTION set_order_number() SET search_path = public;
ALTER FUNCTION set_invoice_number() SET search_path = public;
ALTER FUNCTION compute_employee_occasions(uuid, integer) SET search_path = public;
