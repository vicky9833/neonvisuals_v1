-- Prompt 4a item 1: PII data-encryption key custody in Supabase Vault.
-- The 32-byte AES-256 key is generated IN-DB (pgcrypto gen_random_bytes) and stored
-- in Vault, so the key value NEVER transits the application or any log. Versioned
-- name ('pii_dek_v1') so rotation is incremental later (envelope carries the version).
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'pii_dek_v1') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'base64'),
      'pii_dek_v1',
      'PII data encryption key v1 (AES-256-GCM, app-layer envelope). Prompt 4a.'
    );
  end if;
end $$;

-- Accessor: returns the base64 DEK for a given version. SECURITY DEFINER (owner can
-- read the vault view); locked to service_role ONLY. anon/authenticated cannot reach it,
-- so the key is never exposed to a browser-reachable JWT.
create or replace function public.get_pii_dek(p_version int)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select ds.decrypted_secret
  from vault.decrypted_secrets ds
  where ds.name = 'pii_dek_v' || p_version::text;
$$;

revoke all on function public.get_pii_dek(int) from public;
revoke all on function public.get_pii_dek(int) from anon;
revoke all on function public.get_pii_dek(int) from authenticated;
grant execute on function public.get_pii_dek(int) to service_role;

comment on function public.get_pii_dek(int) is 'Returns the base64 PII DEK for a version from Vault. service_role only. Prompt 4a.';
