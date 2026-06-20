-- ============================================================
-- 015_system_settings.sql — System settings (Prompt 17)
-- ============================================================
-- A single global JSON row holds platform settings (company details,
-- payment gateway, notifications, branding). Super-admin only.
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin system_settings" ON system_settings;
CREATE POLICY "Super admin system_settings" ON system_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "Service role system_settings" ON system_settings;
CREATE POLICY "Service role system_settings" ON system_settings FOR ALL
  USING (auth.role() = 'service_role');

-- Seed the global row.
INSERT INTO system_settings (id, settings)
VALUES ('global', '{}')
ON CONFLICT (id) DO NOTHING;
