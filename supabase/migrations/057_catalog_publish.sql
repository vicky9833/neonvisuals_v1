-- P11b — admin product CRUD + publish pipeline (additive; no destructive change).
--
-- The `platform.catalog.publish` capability itself is CODE-only (src/lib/authz/matrix.ts,
-- owner/admin + audited) — no DB grant table exists in this two-plane model, so nothing to add here
-- for auth.
--
-- This migration seeds the publish-state singleton in the existing `system_settings` table
-- (id-keyed `settings jsonb`; already used for `catalog_kit_hero_images`). The row records the
-- last-published per-SKU hash map + timestamp so the admin "N pending changes" indicator can diff the
-- current DB payload set against what was last published. It is created UNSEEDED (`seeded=false`);
-- the app lazily seeds the baseline from the current active catalog on first read (baseline == live,
-- so pending starts at 0 — the committed static file was generated from these exact payloads).
--
-- The separate `catalog_pending_publish` row (regen output awaiting a manual commit+deploy) is
-- written by the publish action at runtime; it is not pre-seeded here.

insert into public.system_settings (id, settings)
values (
  'catalog_publish_state',
  jsonb_build_object(
    'seeded', false,
    'published_hashes', '{}'::jsonb,
    'published_at', null,
    'published_count', 0
  )
)
on conflict (id) do nothing;

comment on table public.system_settings is
  'Key-value app settings. P11a: catalog_kit_hero_images (kit hero export). P11b: catalog_publish_state (last-published per-SKU hash baseline for the pending-changes indicator) + catalog_pending_publish (regen output awaiting manual commit+deploy).';
