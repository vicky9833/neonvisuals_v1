-- Prompt 5a item 1: extend festival_calendar (region/faith/default_lead_days) + backfill
-- 2025/2026 + seed 2027 (§4D). Lunar 2027 dates SEEDED from cited sources (verify5a/1_festivals.md).
alter table public.festival_calendar add column if not exists region text;
alter table public.festival_calendar add column if not exists faith text;
alter table public.festival_calendar add column if not exists default_lead_days integer;

update public.festival_calendar set
  default_lead_days = case name
    when 'Diwali' then 45 when 'Holi' then 21 when 'Christmas' then 30 when 'New Year' then 30
    when 'Eid al-Fitr' then 21 when 'Raksha Bandhan' then 14 when 'Ganesh Chaturthi' then 21
    when 'Navratri' then 21 when 'Onam' then 21 when 'Makar Sankranti / Pongal' then 21
    when 'Republic Day' then 14 when 'Independence Day' then 14 else 21 end,
  region = case name
    when 'Ganesh Chaturthi' then 'West India' when 'Navratri' then 'West India'
    when 'Onam' then 'South India' when 'Holi' then 'North India'
    when 'Raksha Bandhan' then 'North India' else 'pan-India' end,
  faith = case name
    when 'Christmas' then 'Christian' when 'Eid al-Fitr' then 'Muslim' when 'New Year' then 'Secular'
    when 'Republic Day' then 'National' when 'Independence Day' then 'National' else 'Hindu' end
where year in (2025, 2026);

-- 2027 seed. Dates: fixed (NY/RepublicDay/IndDay/Christmas), verified multi-source
-- (Diwali 29 Oct, Holi 22 Mar, RakshaBandhan 17 Aug, Ganesh 4 Sep), sourced (Onam 11 Sep,
-- Navratri 30 Sep start), ESTIMATED moon-dependent (Eid al-Fitr 9 Mar), minor ±1 (Makar
-- Sankranti 14 Jan; calendarlabs alt 15 Jan). See verify5a/1_festivals.md for sources.
insert into public.festival_calendar (name, occasion_type, date, year, description, recommended_buckets, is_active, region, faith, default_lead_days)
select v.name, v.occasion_type, v.date, v.year, v.description, v.rb::public.bucket_code[], v.is_active, v.region, v.faith, v.lead from (values
  ('New Year', 'new_year'::public.occasion_type, date '2027-01-01', 2027, 'New Year''s Day', array['D'], true, 'pan-India', 'Secular', 30),
  ('Makar Sankranti / Pongal', 'festival_pongal'::public.occasion_type, date '2027-01-14', 2027, 'Harvest festival', array['D'], true, 'pan-India', 'Hindu', 21),
  ('Republic Day', null::public.occasion_type, date '2027-01-26', 2027, 'National holiday', array['D'], true, 'pan-India', 'National', 14),
  ('Holi', 'festival_holi'::public.occasion_type, date '2027-03-22', 2027, 'Festival of colours', array['D'], true, 'North India', 'Hindu', 21),
  ('Eid al-Fitr', 'festival_eid'::public.occasion_type, date '2027-03-09', 2027, 'End of Ramadan (moon-dependent, estimated)', array['D'], true, 'pan-India', 'Muslim', 21),
  ('Raksha Bandhan', null::public.occasion_type, date '2027-08-17', 2027, 'Sibling bond festival', array['D'], true, 'North India', 'Hindu', 14),
  ('Independence Day', null::public.occasion_type, date '2027-08-15', 2027, 'National holiday', array['D'], true, 'pan-India', 'National', 14),
  ('Ganesh Chaturthi', null::public.occasion_type, date '2027-09-04', 2027, 'Birth of Ganesha', array['D'], true, 'West India', 'Hindu', 21),
  ('Onam', 'festival_onam'::public.occasion_type, date '2027-09-11', 2027, 'Kerala harvest festival', array['D'], true, 'South India', 'Hindu', 21),
  ('Navratri', null::public.occasion_type, date '2027-09-30', 2027, 'Nine nights of Durga (start)', array['D'], true, 'West India', 'Hindu', 21),
  ('Diwali', 'festival_diwali'::public.occasion_type, date '2027-10-29', 2027, 'Festival of lights (Lakshmi Puja)', array['D'], true, 'pan-India', 'Hindu', 45),
  ('Christmas', 'festival_christmas'::public.occasion_type, date '2027-12-25', 2027, 'Christmas Day', array['D'], true, 'pan-India', 'Christian', 30)
) as v(name, occasion_type, date, year, description, rb, is_active, region, faith, lead)
where not exists (select 1 from public.festival_calendar f where f.name = v.name and f.year = 2027);
