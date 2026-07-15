-- =============================================================================
-- Neon Visuals — tenant/platform WRITE policies (020)  [Prompt 2, item 6]
-- =============================================================================
-- ADDITIVE / NON-DESTRUCTIVE (CREATE POLICY only; no drops).
--
-- Item 6 moves quote/order/billing/pdf engines OFF the service-role client onto
-- the request-scoped RLS client. Today those tables have ONLY `_read` (SELECT)
-- and `_service` (service_role ALL) policies, so a user-client write is rejected
-- for everyone. These policies restore writes under the two-layer model:
--
--   RLS (here)      = coarse TENANT ISOLATION backstop
--                     ( is_platform_staff() OR company_id IN user_company_ids() )
--   authorize()     = the fine-grained gate (role / ≤limit / own-dept / audit),
--                     the single source of role truth (src/lib/authz/matrix.ts).
--
-- This mirrors the existing `_read` policy shape. Role precision is intentionally
-- NOT duplicated in SQL (it cannot express ≤limit / own-dept and would drift
-- from the matrix). Approved design: "isolation-mirror + authorize()".
--
-- Applied to hosted project xserhblhiwtmaiejbvgo (free plan, no PITR).
-- =============================================================================

-- ---- company_id-scoped financial tables: INSERT + UPDATE -------------------
CREATE POLICY "quotes_write_insert" ON public.quotes FOR INSERT
  WITH CHECK (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));
CREATE POLICY "quotes_write_update" ON public.quotes FOR UPDATE
  USING (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));

CREATE POLICY "orders_write_insert" ON public.orders FOR INSERT
  WITH CHECK (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));
CREATE POLICY "orders_write_update" ON public.orders FOR UPDATE
  USING (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));

CREATE POLICY "invoices_write_insert" ON public.invoices FOR INSERT
  WITH CHECK (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));
CREATE POLICY "invoices_write_update" ON public.invoices FOR UPDATE
  USING (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));

CREATE POLICY "payments_write_insert" ON public.payments FOR INSERT
  WITH CHECK (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));
CREATE POLICY "payments_write_update" ON public.payments FOR UPDATE
  USING (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (public.is_platform_staff() OR company_id IN (SELECT public.user_company_ids()));

-- ---- order-child tables: scoped through the parent order -------------------
-- order_items: INSERT / UPDATE / DELETE
CREATE POLICY "order_items_write_insert" ON public.order_items FOR INSERT
  WITH CHECK (public.is_platform_staff() OR order_id IN (
    SELECT id FROM public.orders WHERE company_id IN (SELECT public.user_company_ids())));
CREATE POLICY "order_items_write_update" ON public.order_items FOR UPDATE
  USING (public.is_platform_staff() OR order_id IN (
    SELECT id FROM public.orders WHERE company_id IN (SELECT public.user_company_ids())))
  WITH CHECK (public.is_platform_staff() OR order_id IN (
    SELECT id FROM public.orders WHERE company_id IN (SELECT public.user_company_ids())));
CREATE POLICY "order_items_write_delete" ON public.order_items FOR DELETE
  USING (public.is_platform_staff() OR order_id IN (
    SELECT id FROM public.orders WHERE company_id IN (SELECT public.user_company_ids())));

-- order_status_history: INSERT only (append-only lifecycle log)
CREATE POLICY "order_status_history_write_insert" ON public.order_status_history FOR INSERT
  WITH CHECK (public.is_platform_staff() OR order_id IN (
    SELECT id FROM public.orders WHERE company_id IN (SELECT public.user_company_ids())));

-- order_recipients: INSERT / UPDATE / DELETE
CREATE POLICY "order_recipients_write_insert" ON public.order_recipients FOR INSERT
  WITH CHECK (public.is_platform_staff() OR order_id IN (
    SELECT id FROM public.orders WHERE company_id IN (SELECT public.user_company_ids())));
CREATE POLICY "order_recipients_write_update" ON public.order_recipients FOR UPDATE
  USING (public.is_platform_staff() OR order_id IN (
    SELECT id FROM public.orders WHERE company_id IN (SELECT public.user_company_ids())))
  WITH CHECK (public.is_platform_staff() OR order_id IN (
    SELECT id FROM public.orders WHERE company_id IN (SELECT public.user_company_ids())));
CREATE POLICY "order_recipients_write_delete" ON public.order_recipients FOR DELETE
  USING (public.is_platform_staff() OR order_id IN (
    SELECT id FROM public.orders WHERE company_id IN (SELECT public.user_company_ids())));

-- ---- platform-staff fulfilment writes on tenant-managed tables -------------
-- Order fulfilment (createOrderFromQuote → recordGift) writes gift_records and
-- employee_preferences across orgs. Those tables' existing `_rw` policies are
-- tenant-role-only (owner/admin/hr) which platform staff do not satisfy. Add a
-- platform-staff write path (app-layer authorize() + audit still gate it).
CREATE POLICY "gift_records_platform_write" ON public.gift_records FOR ALL
  USING (public.is_platform_staff()) WITH CHECK (public.is_platform_staff());

CREATE POLICY "employee_preferences_platform_write" ON public.employee_preferences FOR ALL
  USING (public.is_platform_staff()) WITH CHECK (public.is_platform_staff());
