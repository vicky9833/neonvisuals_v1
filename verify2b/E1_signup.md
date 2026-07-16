# E1 — `handle_new_user()` no longer writes `profiles.role`

**Migration applied (live shared DB):** `e1_handle_new_user_stop_writing_role`.

## New function body (authoritative)
```sql
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
```
Change vs prior: removed `role` from the column list and the
`COALESCE(NEW.raw_user_meta_data->>'role','client')` value. Trigger wiring unchanged
(`on_auth_user_created` AFTER INSERT ON `auth.users`).

## Acceptance — REAL signup (t2b_ prefixed), then deleted, zero residue
Run log: `./verify2b/E1_signup_run.txt`. Evidence:
```
RUNID=20260716081811  EMAIL=t2b_20260716081811_signup@example.com
CREATED_AUTH_USER_ID=9422af6a-4668-4bd6-b55d-b9f04d425510
PROFILE_ROW:
{ "id":"9422af6a-…", "email":"t2b_20260716081811_signup@example.com",
  "full_name":"t2b 20260716081811 Tester", "role":"client",
  "company_id":null, "is_onboarded":false }
DELETED_AUTH_USER=9422af6a-4668-4bd6-b55d-b9f04d425510
RESIDUE_PROFILES_COUNT=0
RESIDUE_AUTH_USERS_COUNT=0
```
- Signup via GoTrue admin API fired `on_auth_user_created` → `handle_new_user` → profile row
  created **with no error**.
- `role` = `'client'` came from the **column DEFAULT** (the trigger did not set it) — proves the
  omitted insert still satisfies `NOT NULL`.
- Delete cascaded (`profiles_id_fkey … ON DELETE CASCADE`); post-delete `t2b_` residue = **0** in
  both `profiles` and `auth.users`.

(Test note: GoTrue rejects the secret key from browser-like UAs; the script sets a non-browser
User-Agent. First attempt was rejected before creating anything, so no stray user.)
