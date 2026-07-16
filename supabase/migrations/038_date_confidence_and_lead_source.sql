-- Prompt 5a addition 1: festival_calendar.date_confidence — makes lunar-date uncertainty
-- ACTIONABLE (Prompt 6 dispatch can nudge "confirm this date" before booking against estimated).
alter table public.festival_calendar add column if not exists date_confidence text not null default 'verified' check (date_confidence in ('verified','estimated'));
update public.festival_calendar set date_confidence = 'estimated'
  where year = 2027 and name in ('Eid al-Fitr', 'Makar Sankranti / Pongal');

-- Prompt 5a addition 2: occasion_types.lead_days_source — spec-pinned (§4A person) vs provisional
-- (§4B/§4C), so future tuning knows which lead times were authoritative.
alter table public.occasion_types add column if not exists lead_days_source text not null default 'provisional' check (lead_days_source in ('spec','provisional'));
update public.occasion_types set lead_days_source = 'spec'
  where key in ('birthday','work_anniversary','milestone_anniversary','onboarding','probation_completion');
