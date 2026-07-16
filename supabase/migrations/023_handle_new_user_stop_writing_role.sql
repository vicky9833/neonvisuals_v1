-- ============================================================
-- 023_handle_new_user_stop_writing_role.sql — Prompt 2b E1
-- ============================================================
-- Retire the conflated profiles.role model: the signup trigger no
-- longer writes profiles.role. The column remains (NOT NULL DEFAULT
-- 'client'), so an omitted insert still satisfies the constraint.
-- Applied to the shared project as remote migration version
-- 20260716024614_e1_handle_new_user_stop_writing_role.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Prompt 2b E1: no longer writes profiles.role (deprecated). The column keeps
  -- its NOT NULL DEFAULT 'client', so an omitted insert still satisfies it.
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
