import { NextResponse } from "next/server";
import { requireTenant, apiAuthErrorResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getKit, kitToQuoteProducts, clearKit } from "@/lib/engines/kit";
import { requestQuote } from "@/lib/engines/quote-request";

export const runtime = "nodejs";

/**
 * P9d (R3) — kit → 7a quote handoff. Reads the caller's OWN persisted kit (RLS), creates a
 * company-scoped quote from its items via the same 7a requestQuote engine, then clears the kit.
 * Gated by quote.request (same capability as /api/quotes/request).
 */
export async function POST() {
  try {
    const principal = await requireTenant("quote.request", null);
    const companyId = principal.company_id;
    if (!companyId) {
      return NextResponse.json({ error: "no_company", message: "No company membership." }, { status: 400 });
    }
    const userClient = await createClient();
    const kit = await getKit(userClient, companyId, principal.id);
    if (kit.length === 0) {
      return NextResponse.json({ error: "empty_kit", message: "Your kit is empty." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: company } = await admin.from("companies").select("name").eq("id", companyId).maybeSingle();

    const quote = await requestQuote(userClient, admin, {
      companyId,
      requestedBy: principal.id,
      occasion: null,
      products: kitToQuoteProducts(kit),
      clientCompany: (company?.name as string) ?? null,
      clientEmail: principal.email,
    });

    // Kit consumed → clear it so the next visit starts fresh.
    await clearKit(userClient, companyId, principal.id);

    return NextResponse.json({ data: quote }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[api/kit/checkout]", err);
    return NextResponse.json({ error: "server_error", message: "Could not submit the kit." }, { status: 500 });
  }
}
