import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * SINGLE source of truth for "who at this company should receive an email?".
 *
 * Cron/dispatch code MUST call this and nothing else — do not scatter recipient
 * look-ups across files. Uses the service-role client because this runs in the
 * cron (cross-tenant, no user session — KEPT ELEVATED, item 6).
 *
 * Prompt 2 (item 5): recipients now come from companies.primary_contact_email +
 * `company_members` (active) → `profiles.email`, NOT profiles.company_id.
 */
export interface CompanyRecipients {
  clientName: string;
  emails: string[];
}

export async function resolveCompanyRecipients(
  companyId: string,
): Promise<CompanyRecipients> {
  const supa = createAdminClient();

  const { data: company } = await supa
    .from("companies")
    .select("name, primary_contact_name, primary_contact_email")
    .eq("id", companyId)
    .maybeSingle();

  // Tenant scoping via company_members (active), then resolve member emails
  // from profiles by user id. Replaces the retired profiles.company_id lookup.
  const { data: members } = await supa
    .from("company_members")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("status", "active");

  const memberIds = (members ?? [])
    .map((m) => m.user_id as string | null)
    .filter((id): id is string => Boolean(id));

  const emails = new Set<string>();
  const primary = (company?.primary_contact_email as string | null) ?? null;
  if (primary) emails.add(primary.trim().toLowerCase());

  if (memberIds.length > 0) {
    const { data: profiles } = await supa
      .from("profiles")
      .select("email")
      .in("id", memberIds);
    for (const row of profiles ?? []) {
      const e = (row.email as string | null)?.trim().toLowerCase();
      if (e) emails.add(e);
    }
  }

  return {
    clientName:
      (company?.primary_contact_name as string | null) ??
      (company?.name as string | null) ??
      "there",
    emails: [...emails],
  };
}
