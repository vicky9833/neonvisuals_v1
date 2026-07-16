-- Prompt 5a item 5: company_festivals is the canonical opt-in (wired in occasions.ts).
-- companies.observed_festivals[] is unused -> reversibly deprecate by rename.
alter table public.companies rename column observed_festivals to _deprecated_observed_festivals;
