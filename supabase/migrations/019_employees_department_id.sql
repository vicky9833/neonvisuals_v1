-- =============================================================================
-- Neon Visuals — employees.department_id (019)  [Prompt 2, item 1]
-- =============================================================================
-- ADDITIVE / NON-DESTRUCTIVE. Adds a nullable FK column so the own-dept
-- conditional in the permission matrix binds to a real column rather than dead
-- code. This does NOT backfill from the free-text `employees.department` column
-- and does NOT drop that column — both are Prompt 2b (gated on Supabase Pro).
--
-- Applied to hosted project xserhblhiwtmaiejbvgo (free plan, no PITR).
-- =============================================================================

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS department_id UUID
    REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_department_id
  ON public.employees (department_id);

COMMENT ON COLUMN public.employees.department_id IS
  'Nullable FK -> departments.id. Powers the own-dept authorization conditional. '
  'Text `department` column is retained until the Prompt 2b backfill/cutover.';
