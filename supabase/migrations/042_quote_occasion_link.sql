-- Prompt 7a: stable occasion link on quotes + org_id/company_id standardization.
--
-- occasion_key: the STABLE occasion identity (stableOccasionKey shape from 6b:
-- company:employee|cw:type:date[:title]) — NOT a FK to the ephemeral occasions.id (regenerated
-- each cron run -> would orphan). Nullable: ad-hoc quotes have no occasion. A quote and its
-- occasion_gift_state row share this key so escalation suppression joins correctly.
alter table public.quotes add column if not exists occasion_key text;
create index if not exists quotes_occasion_key_idx on public.quotes(occasion_key) where occasion_key is not null;

-- org_id/company_id standardization (recon 7.0 duplicate-column debt): RLS keys on company_id;
-- org_id was read only by dashboard queries (fixed to company_id in this prompt) and never written
-- by any create path. They are redundant tenant-company references (both NULL on the one existing
-- quote). Standardize on company_id (tenant-plane convention); reversibly deprecate org_id. The
-- index on org_id follows the rename automatically.
alter table public.quotes rename column org_id to _deprecated_org_id;

notify pgrst, 'reload schema';
