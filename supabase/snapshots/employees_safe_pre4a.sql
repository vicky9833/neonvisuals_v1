-- ============================================================================
-- SNAPSHOT — employees_safe view as it existed IMMEDIATELY BEFORE Prompt 4a.
-- Captured from pg_get_viewdef on foundation @ 76c7938 (recon R2).
-- The view was SECURITY DEFINER (security_invoker=false) and leaked
-- city/pincode/notes to every company member. Prompt 4a DROPs it and moves PII
-- to employee_pii behind proper §6A RLS. Kept here so the drop is reversible by
-- reference (no data existed — employees was 0 rows).
-- ============================================================================

CREATE VIEW public.employees_safe WITH (security_invoker = false) AS
  SELECT id,
         company_id,
         employee_code,
         full_name,
         email,
         department,
         designation,
         reporting_manager,
         joining_date,
         hometown,
         interests,
         archetype,
         linkedin_url,
         dietary_restrictions,
         gift_preferences,
         tier,
         is_active,
         manager_name,
         manager_email,
         tshirt_size,
         dietary_preference,
         hobbies,
         city,
         pincode,
         notes,
         avatar_url,
         type,
         consent_status,
         offboarded_at,
         purge_after,
         created_at,
         updated_at,
         created_by
    FROM public.employees e
   WHERE public.is_platform_staff()
      OR (company_id IN (SELECT public.user_company_ids() AS user_company_ids));

GRANT SELECT ON public.employees_safe TO authenticated;

COMMENT ON VIEW public.employees_safe IS
  'PII-safe projection of employees (no phone/dob_day/dob_month/delivery_address). '
  'SECURITY DEFINER by design: enforces its own membership WHERE so finance/viewer '
  'read safe columns while base-table RLS denies them PII.';
