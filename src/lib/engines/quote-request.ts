import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stableOccasionKey, writeGiftChosen } from "@/lib/engines/notifications";

/**
 * Tenant quote-request (Prompt 7a, §9). An authorized tenant user (quote.request per §6A) requests
 * a quote FOR an occasion (or ad-hoc). Distinct from the OPS quote flow (quote.ts, platform-gated):
 * this is company-scoped (RLS via the user client) and, when occasion-linked, writes
 * occasion_gift_state (the P6 "gift chosen" signal) so 6b escalation suppresses.
 *
 * The quote carries the STABLE occasion key (never occasions.id — regenerated). The gift-state row
 * shares that key so giftChosenFor() joins.
 */

export interface QuoteRequestOccasion {
  employeeId: string | null; // null = company-wide
  occasionTypeKey: string;
  occasionDate: string; // ISO
  title?: string | null; // display only (P9b editable) — no longer part of the cw key
  /** P9a FK identity for a company-wide occasion (festival_id or custom_occasion_id). */
  festivalId?: string | null;
  customOccasionId?: string | null;
}

export interface QuoteRequestInput {
  companyId: string;
  requestedBy: string;
  occasion?: QuoteRequestOccasion | null;
  products: Array<{ sku: string; quantity: number }>;
  notes?: string | null;
  budgetHint?: number | null;
  clientCompany?: string | null; // the tenant's own company name (for ops display)
  clientEmail?: string | null; // requester email (for ops display)
}

export interface RequestedQuote {
  id: string;
  quote_number: string | null;
  status: string;
  occasion_key: string | null;
}

/**
 * @param userClient  RLS-scoped client (company-scoped insert; the WITH CHECK requires
 *                    company_id ∈ user_company_ids()).
 * @param adminClient service-role client for the occasion_gift_state write (system signal).
 */
export async function requestQuote(
  userClient: SupabaseClient,
  adminClient: SupabaseClient,
  input: QuoteRequestInput,
): Promise<RequestedQuote> {
  const occasionKey = input.occasion
    ? stableOccasionKey({
        company_id: input.companyId,
        employee_id: input.occasion.employeeId,
        occasion_type_key: input.occasion.occasionTypeKey,
        date: input.occasion.occasionDate,
        festival_id: input.occasion.festivalId,
        custom_occasion_id: input.occasion.customOccasionId,
      })
    : null;

  const totalQty = input.products.reduce((n, p) => n + Math.max(0, p.quantity || 0), 0);
  const quoteNumber = `REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  const { data, error } = await userClient
    .from("quotes")
    .insert({
      company_id: input.companyId,
      created_by: input.requestedBy,
      quote_number: quoteNumber,
      occasion_key: occasionKey,
      occasion: input.occasion?.title ?? input.occasion?.occasionTypeKey ?? null,
      products: input.products,
      quantity: totalQty,
      kit_count: totalQty,
      status: "draft",
      client_company: input.clientCompany ?? null,
      client_email: input.clientEmail ?? null,
      notes: input.notes ?? null,
      budget_hint: input.budgetHint ?? null,
    })
    .select("id, quote_number, status, occasion_key")
    .single();
  if (error) throw new Error(`requestQuote: ${error.message}`);

  // The P6 obligation: an occasion-linked request = "gift chosen" -> suppress escalation.
  if (input.occasion) {
    await writeGiftChosen(
      adminClient,
      {
        company_id: input.companyId,
        employee_id: input.occasion.employeeId,
        occasion_type_key: input.occasion.occasionTypeKey,
        date: input.occasion.occasionDate,
        festival_id: input.occasion.festivalId,
        custom_occasion_id: input.occasion.customOccasionId,
      },
      { quoteId: data.id as string, chosenBy: input.requestedBy },
    );
  }

  return data as RequestedQuote;
}

/** List the caller's company quotes (RLS-scoped) for the tenant quote view. */
export async function listCompanyQuotes(userClient: SupabaseClient): Promise<
  Array<{ id: string; quote_number: string | null; status: string; occasion: string | null; final_total: number | null; total_amount: number | null; created_at: string }>
> {
  const { data, error } = await userClient
    .from("quotes")
    .select("id, quote_number, status, occasion, final_total, total_amount, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`listCompanyQuotes: ${error.message}`);
  return (data ?? []) as never;
}
