-- =============================================================================
-- Neon Visuals — Add Collections I/J/K (003): enum extension ONLY.
-- Split from the seed (004) because a new enum value cannot be used in the
-- same transaction that adds it. This file commits first.
-- Additive only. RLS untouched.
-- =============================================================================

ALTER TYPE bucket_code ADD VALUE IF NOT EXISTS 'I';
ALTER TYPE bucket_code ADD VALUE IF NOT EXISTS 'J';
ALTER TYPE bucket_code ADD VALUE IF NOT EXISTS 'K';
