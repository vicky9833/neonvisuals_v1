import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiAuth,
  requireApiRole,
  apiAuthErrorResponse,
} from "@/lib/api-auth";
import {
  createInvoice,
  listInvoices,
  toClientInvoice,
  type InvoiceStatus,
} from "@/lib/engines/billing";

export const runtime = "nodejs";

const createSchema = z.object({
  orderId: z.string().uuid(),
  invoiceType: z.enum(["advance", "balance", "standard", "proforma"]),
  paymentPercentage: z.number().min(1).max(100),
  dueDate: z.string().min(1),
  buyerGstin: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const profile = await requireApiRole(["super_admin"]);
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    const invoice = await createInvoice(parsed.data, profile.id);
    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "create_failed", message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const profile = await requireApiAuth();
    const { searchParams } = new URL(request.url);
    const isAdmin = profile.role === "super_admin";

    if (!isAdmin && !profile.company_id) {
      return NextResponse.json({ data: { invoices: [], total: 0 } });
    }

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const result = await listInvoices({
      companyId: isAdmin
        ? (searchParams.get("companyId") ?? undefined)
        : profile.company_id!,
      orderId: searchParams.get("orderId") ?? undefined,
      status: (searchParams.get("status") as InvoiceStatus) ?? undefined,
      dateRange: from && to ? { start: from, end: to } : undefined,
    });

    if (isAdmin) return NextResponse.json({ data: result });
    return NextResponse.json({
      data: {
        invoices: result.invoices.map(toClientInvoice),
        total: result.total,
      },
    });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "list_failed", message }, { status: 500 });
  }
}
