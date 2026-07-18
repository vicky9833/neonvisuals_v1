import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTenant, apiAuthErrorResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requestQuote } from "@/lib/engines/quote-request";
import { notify, NOTIFICATION_TYPES } from "@/lib/engines/notifications";
import { buildOpsWaLink } from "@/lib/utils/wa";
import { sendNotificationEmail } from "@/lib/services/email";

export const runtime = "nodejs";

/**
 * Tenant quote-request (§9). Gated by the TENANT matrix capability `quote.request`
 * (hr/org_admin/org_owner/manager-own-dept per §6A) — NOT the ops-only requirePlatform the
 * existing quote routes use. Creates a company-scoped quote (RLS), writes the occasion_gift_state
 * "gift chosen" signal when occasion-linked (suppresses 6b escalation), and fires a PII-safe ops
 * notification (in-app + email + wa.me with org context, NO employee PII).
 */
const schema = z.object({
  occasion: z
    .object({
      employeeId: z.string().uuid().nullable().optional(),
      occasionTypeKey: z.string().min(1).max(64),
      occasionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      title: z.string().max(200).nullable().optional(),
      festivalId: z.string().uuid().nullable().optional(),
      customOccasionId: z.string().uuid().nullable().optional(),
    })
    .nullable()
    .optional(),
  products: z
    .array(z.object({ sku: z.string().min(1), quantity: z.number().int().positive() }))
    .min(1),
  notes: z.string().max(2000).nullable().optional(),
  budgetHint: z.number().int().positive().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const principal = await requireTenant("quote.request", null);
    const companyId = principal.company_id;
    if (!companyId) {
      return NextResponse.json({ error: "no_company", message: "No company membership." }, { status: 400 });
    }
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }

    const admin = createAdminClient();
    // Company context (for ops display + wa.me). Employee PII never enters the notification.
    const { data: company } = await admin
      .from("companies")
      .select("name, plan, primary_contact_name, primary_contact_phone")
      .eq("id", companyId)
      .maybeSingle();

    const userClient = await createClient();
    const quote = await requestQuote(userClient, admin, {
      companyId,
      requestedBy: principal.id,
      occasion: parsed.data.occasion
        ? {
            employeeId: parsed.data.occasion.employeeId ?? null,
            occasionTypeKey: parsed.data.occasion.occasionTypeKey,
            occasionDate: parsed.data.occasion.occasionDate,
            title: parsed.data.occasion.title ?? null,
            festivalId: parsed.data.occasion.festivalId ?? null,
            customOccasionId: parsed.data.occasion.customOccasionId ?? null,
          }
        : null,
      products: parsed.data.products,
      notes: parsed.data.notes ?? null,
      budgetHint: parsed.data.budgetHint ?? null,
      clientCompany: (company?.name as string) ?? null,
      clientEmail: principal.email,
    });

    // §7/§9 ops alert — PII-SAFE (org + occasion TYPE + item count; NEVER an employee name/dob).
    const orgName = (company?.name as string) ?? "A company";
    const occType = parsed.data.occasion?.occasionTypeKey ?? null;
    const itemCount = parsed.data.products.reduce((n, p) => n + p.quantity, 0);
    const wa = buildOpsWaLink({
      clientPhone: (company?.primary_contact_phone as string | null) ?? null,
      orgName,
      plan: (company?.plan as string | null) ?? null,
      contactName: (company?.primary_contact_name as string | null) ?? null,
      occasionType: occType,
    });
    const subject = `New quote request from ${orgName}`;
    const body = `${orgName}${company?.plan ? ` (${company.plan})` : ""} requested a quote${occType ? ` for a ${occType} occasion` : ""} — ${itemCount} item${itemCount === 1 ? "" : "s"}. Quote ${quote.quote_number ?? quote.id}.`;
    try {
      await notify(admin, {
        type: NOTIFICATION_TYPES.QUOTE_REQUEST_OPS,
        audience: [{ plane: "platform", role: "platform_admin" }],
        companyId,
        title: subject,
        body,
        link: wa ?? "/ops/quotes",
        dedupeKey: `qreq:${quote.id}`,
        email: { subject, html: `<p>${body}</p>${wa ? `<p><a href="${wa}">Chat on WhatsApp</a></p>` : ""}`, template: "quote_request_ops" },
      });
    } catch (e) {
      console.error("[quotes/request] ops notify failed:", e);
    }

    return NextResponse.json({ data: quote }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[quotes/request]", err);
    return NextResponse.json({ error: "server_error", message: "Could not request a quote." }, { status: 500 });
  }
}
