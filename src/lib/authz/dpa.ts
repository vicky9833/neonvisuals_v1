/**
 * Data Processing Agreement (DPA) consent — versioned source of truth.
 *
 * §10 attestation is captured at org creation and stored on `companies`
 * (dpa_accepted_at / dpa_accepted_by / dpa_version / dpa_ip). Bump DPA_VERSION
 * whenever the attestation text or the referenced DPA document changes; the
 * stored version records exactly which text a company owner accepted.
 *
 * Pure/import-safe (no server-only, no runtime) — usable from client + server.
 */

/** Version stamp written to companies.dpa_version. Bump on any text/doc change. */
export const DPA_VERSION = "2026-07-16.v1";

/** Human reference to the DPA document the attestation binds to. */
export const DPA_DOC_REF = "Neon Visuals Data Processing Agreement";
/** Same-environment relative path to the DPA page (works on preview + prod). */
export const DPA_DOC_URL = "/legal/dpa";

/** §10 attestation the org creator must affirm before a company is created. */
export const DPA_ATTESTATION =
  "I confirm I am authorised to share my employees' data and have given them the required notice.";
