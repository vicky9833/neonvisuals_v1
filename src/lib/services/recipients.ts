import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * SINGLE source of truth for "who at this company should receive an email?".
 *
 * Cron/dispatch code MUST call this and nothing else — do not scatter recipient
 * look-ups across files. Uses the service-role client because this runs in the
 * cron (cross-tenant, no user session).
 *
 * TODO(P2): switch the recipient source from companies.primary_contact_email +
 * profiles.company_id to company_members (profiles.company_id is retired in
 * Prompt 2). This one function is the only line that changes.
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

  // TODO(P2): replace this profiles.company_id lookup with company_members.
  const { data: profiles } = await supa
    .from("profiles")
    .select("email")
    .eq("company_id", companyId);

  const emails = new Set<string>();
  const primary = (company?.primary_contact_email as string | null) ?? null;
  if (primary) emails.add(primary.trim().toLowerCase());
  for (const row of profiles ?? []) {
    const e = (row.email as string | null)?.trim().toLowerCase();
    if (e) emails.add(e);
  }

  return {
    clientName:
      (company?.primary_contact_name as string | null) ??
      (company?.name as string | null) ??
      "there",
    emails: [...emails],
  };
}
