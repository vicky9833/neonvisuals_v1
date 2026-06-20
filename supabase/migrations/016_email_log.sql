-- ============================================================
-- 016_email_log.sql — Transactional email log (Prompt 20)
-- ============================================================

CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT NOT NULL,
  resend_id TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_log_to ON email_log(to_email);
CREATE INDEX IF NOT EXISTS idx_email_log_template ON email_log(template);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log(created_at DESC);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin email_log" ON email_log;
CREATE POLICY "Super admin email_log" ON email_log FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

DROP POLICY IF EXISTS "Service role email_log" ON email_log;
CREATE POLICY "Service role email_log" ON email_log FOR ALL
  USING (auth.role() = 'service_role');
