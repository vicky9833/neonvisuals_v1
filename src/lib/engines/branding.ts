import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * P9d (R1) — per-org branding resolver + validators.
 *
 * ISOLATION INVARIANT (ruled): branding is ALWAYS resolved from a specific document's company_id,
 * never an ambient/global value. `resolveCompanyBranding(client, companyId)` returns THAT company's
 * branding; a null column falls back to the fixed NEON identity per field. Org A's branding can never
 * appear in org B's document because the only input is B's own company_id (and absent a company_id,
 * callers use NEON_DEFAULT — never another org's branding).
 *
 * LOGO (ruled): external URL only (no bucket). Hardened at write: https-only, image extension, no
 * data:/inline-SVG. Rendered as a locked-down <img> by consumers (never inlined).
 */

export interface Branding {
  orgName: string;
  /** Locked-down external image URL, or null → NEON wordmark. */
  logoUrl: string | null;
  /** Header/primary hex (e.g. #1A1A2E). */
  primary: string;
  /** Accent hex (e.g. #C4A35A). */
  accent: string;
}

/** The fixed NEON identity — the fallback for any null branding field (never a broken render). */
export const NEON_DEFAULT: Branding = {
  orgName: "Neon Visuals",
  logoUrl: null,
  primary: "#1A1A2E",
  accent: "#C4A35A",
};

/** #RGB or #RRGGBB. */
export function isValidHexColor(v: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim());
}

/**
 * Hardened logo URL: https only, an image extension, and no data:/javascript: scheme. Content-type
 * can't be verified at write without a fetch; the extension heuristic + https + <img>-only render is
 * the ruled guard. Returns the trimmed URL or null if invalid.
 */
export function sanitizeLogoUrl(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (!/\.(png|jpe?g|webp|gif|svg)$/i.test(u.pathname)) return null;
  return s;
}

/**
 * Pure resolver from an already-loaded company row (no DB round-trip). Used by the dashboard shell,
 * which already holds the viewer's OWN company. Null/invalid columns → NEON fallback per field.
 */
export function brandingFromCompany(
  company: { name?: string | null; logo_url?: string | null; brand_primary?: string | null; brand_accent?: string | null } | null | undefined,
): Branding {
  if (!company) return NEON_DEFAULT;
  return {
    orgName: (company.name as string) || NEON_DEFAULT.orgName,
    logoUrl: sanitizeLogoUrl(company.logo_url ?? null),
    primary: isValidHexColor(company.brand_primary ?? "") ? (company.brand_primary as string) : NEON_DEFAULT.primary,
    accent: isValidHexColor(company.brand_accent ?? "") ? (company.brand_accent as string) : NEON_DEFAULT.accent,
  };
}

/**
 * Resolve a SPECIFIC company's branding (never ambient). Null columns → NEON fallback per field.
 * Accepts any client; callers pass the service-role admin client or the RLS client for own company.
 */
export async function resolveCompanyBranding(
  client: SupabaseClient,
  companyId: string | null | undefined,
): Promise<Branding> {
  if (!companyId) return NEON_DEFAULT;
  const { data } = await client
    .from("companies")
    .select("name, logo_url, brand_primary, brand_accent")
    .eq("id", companyId)
    .maybeSingle();
  if (!data) return NEON_DEFAULT;
  return {
    orgName: (data.name as string) || NEON_DEFAULT.orgName,
    logoUrl: sanitizeLogoUrl(data.logo_url as string | null),
    primary: isValidHexColor((data.brand_primary as string) ?? "") ? (data.brand_primary as string) : NEON_DEFAULT.primary,
    accent: isValidHexColor((data.brand_accent as string) ?? "") ? (data.brand_accent as string) : NEON_DEFAULT.accent,
  };
}
