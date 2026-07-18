-- Prompt P9b: Demo-org isolation + per-org festival display override. Additive only (deprecate-
-- don't-destroy: no drops, no renames, no data rewrites).
--
-- R3 DEMO ORG — `companies.is_demo`:
--   A demo org is a full tenant row (RLS scopes by company_id as normal) that is granted Pro
--   entitlement AT THE GATE (via isProPlan, same branch shape as plan_override_by) WITHOUT any
--   subscriptions row. Because it has no subscription, the billing cron (subscription-driven) never
--   iterates it — no Razorpay order, no invoice, no dunning, ever. Application code additionally
--   excludes is_demo from the reminders cron company iteration and the platform analytics
--   aggregators so a demo org can never (a) email real-world contacts or (b) pollute platform
--   spend/count aggregates. NOT NULL DEFAULT false → every existing + future real org is is_demo=false.
--
-- R2 PER-ORG FESTIVAL OVERRIDE — `company_festivals.display_name_override`:
--   The shared festival_calendar (32-row platform seed) stays the immutable baseline. A tenant that
--   renames a festival writes a per-company override on their own company_festivals row
--   (keyed company_id + festival_id). DISPLAY-ONLY: P9a moved the title out of the stable occasion
--   key, so an override NEVER touches identity/dedupe/gift-state. Other tenants see the baseline
--   name; the overriding tenant sees their label. Nullable → absence means "use baseline".
--   custom_occasions titles are already tenant-editable (full CRUD since migration 009) — untouched.

alter table public.companies
  add column if not exists is_demo boolean not null default false;

alter table public.company_festivals
  add column if not exists display_name_override text;

-- Partial index: demo orgs are a tiny set; speeds the NOT is_demo sweeps + demo-id resolution.
create index if not exists companies_is_demo_idx on public.companies(is_demo) where is_demo = true;

notify pgrst, 'reload schema';
