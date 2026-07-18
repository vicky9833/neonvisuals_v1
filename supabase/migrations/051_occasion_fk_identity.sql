-- Prompt P9a (D-A): FK identity for the company-wide stable occasion key. Additive only.
--
-- Replaces the display TITLE in the company-wide key with an immutable FK (festival_id for calendar
-- festivals, custom_occasion_id for custom company events) so P9b can make titles editable without
-- orphaning side-table state. Employee-occasion keys (company:employee:type:date) are already
-- FK-stable and untouched. The display `title` column STAYS (P9b makes it editable).
--
-- D-A rationale (CTO ruling): zero populated company-wide rows exist (occasions=0,
-- occasion_gift_state=0), so there is nothing to copy-verify-cutover and no title-bearing key
-- column to deprecate. This migration only introduces the FK identity; new cw rows are BORN with
-- the FK (generator resolves it deterministically). Backfill resolver is retained in code and
-- exercised on synthetic rows (verify 0==0 on real data). Columns are NULLABLE (employee occasions
-- carry no festival/custom id); the generator enforces one-of(festival_id, custom_occasion_id) for
-- every company-wide row at creation.

alter table public.occasions
  add column if not exists festival_id uuid references public.festival_calendar(id),
  add column if not exists custom_occasion_id uuid references public.custom_occasions(id);

alter table public.occasion_gift_state
  add column if not exists festival_id uuid references public.festival_calendar(id),
  add column if not exists custom_occasion_id uuid references public.custom_occasions(id);

create index if not exists occasions_festival_id_idx on public.occasions(festival_id) where festival_id is not null;
create index if not exists occasions_custom_occasion_id_idx on public.occasions(custom_occasion_id) where custom_occasion_id is not null;

notify pgrst, 'reload schema';
