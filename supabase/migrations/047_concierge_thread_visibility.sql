-- Prompt 7d (ruling 1): tighten concierge visibility WITHIN a company.
--
-- Concierge threads can hold sensitive context (layoffs/health signals) → least-visibility by
-- default. Visible to: the RAISER, the company's org_owner/org_admin (oversight), and platform
-- staff (§6C ops queue). NOT all company members — a non-raiser peer (another hr/finance/manager)
-- must NOT see a thread they didn't raise. Replaces the 046 company-wide `user_company_ids()`
-- read policies.

-- ── concierge_requests ──
drop policy if exists concierge_requests_read on public.concierge_requests;
create policy concierge_requests_read on public.concierge_requests
  for select using (
    raised_by = auth.uid()
    or has_company_role(company_id, array['org_owner','org_admin']::company_role[])
    or is_platform_staff()
  );
drop policy if exists concierge_requests_insert on public.concierge_requests;
create policy concierge_requests_insert on public.concierge_requests
  for insert with check (company_id in (select user_company_ids()) and raised_by = auth.uid());
drop policy if exists concierge_requests_update on public.concierge_requests;
create policy concierge_requests_update on public.concierge_requests
  for update using (
    raised_by = auth.uid()
    or has_company_role(company_id, array['org_owner','org_admin']::company_role[])
    or is_platform_staff()
  );

-- ── concierge_messages (visibility follows the parent request) ──
drop policy if exists concierge_messages_read on public.concierge_messages;
create policy concierge_messages_read on public.concierge_messages
  for select using (
    is_platform_staff()
    or exists (
      select 1 from public.concierge_requests r
      where r.id = request_id
        and (r.raised_by = auth.uid() or has_company_role(r.company_id, array['org_owner','org_admin']::company_role[]))
    )
  );
drop policy if exists concierge_messages_insert on public.concierge_messages;
create policy concierge_messages_insert on public.concierge_messages
  for insert with check (
    is_platform_staff()
    or (
      sender_user_id = auth.uid()
      and exists (
        select 1 from public.concierge_requests r
        where r.id = request_id
          and (r.raised_by = auth.uid() or has_company_role(r.company_id, array['org_owner','org_admin']::company_role[]))
      )
    )
  );

-- ── concierge_attachments (visibility follows the parent request) ──
drop policy if exists concierge_attachments_read on public.concierge_attachments;
create policy concierge_attachments_read on public.concierge_attachments
  for select using (
    is_platform_staff()
    or exists (
      select 1 from public.concierge_requests r
      where r.id = request_id
        and (r.raised_by = auth.uid() or has_company_role(r.company_id, array['org_owner','org_admin']::company_role[]))
    )
  );
drop policy if exists concierge_attachments_write on public.concierge_attachments;
create policy concierge_attachments_write on public.concierge_attachments
  for all using (
    is_platform_staff()
    or exists (
      select 1 from public.concierge_requests r
      where r.id = request_id
        and (r.raised_by = auth.uid() or has_company_role(r.company_id, array['org_owner','org_admin']::company_role[]))
    )
  ) with check (
    is_platform_staff()
    or exists (
      select 1 from public.concierge_requests r
      where r.id = request_id
        and (r.raised_by = auth.uid() or has_company_role(r.company_id, array['org_owner','org_admin']::company_role[]))
    )
  );

notify pgrst, 'reload schema';
