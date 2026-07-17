-- Prompt 6a: in-app notification dedupe key. Occasions are regenerated (deleted+reinserted)
-- every cron run, so occasion.id is NOT stable — a naive re-notify would accumulate duplicate
-- in-app rows per cron run. `dedupe_key` carries a STABLE identity (company+employee+type+date)
-- so a repeated notify for the same event+recipient is a no-op (unique index -> insert conflict
-- ignored in the engine). NULL keys are allowed to repeat (distinct user-initiated events).
alter table public.notifications add column if not exists dedupe_key text;
create unique index if not exists notifications_recipient_dedupe_uk
  on public.notifications (recipient_user_id, dedupe_key)
  where dedupe_key is not null;

notify pgrst, 'reload schema';
