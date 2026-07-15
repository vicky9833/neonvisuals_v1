import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiAuth,
  requirePlatform,
  auditCrossTenantAccess,
  apiAuthErrorResponse,
} from "@/lib/api-auth";
import { getInvoice, updateInvoice, toClientInvoice } from "@/lib/engines/billing";

export const runtime = "nodejs";

const updateSchema = z.object({
  status: z
    .enum([
      "draft",
      "sent",
      "viewed",
      "partially_paid",
      "paid",
      "overdue",
      "cancelled",
      "refunded",
    ])
    .optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  terms: z.string().optional(),
  buyerGstin: z.string().optional(),
  buyerAddress: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireApiAuth();
    const { id } = await params;
    const invoice = await getInvoice(id);
    if (!invoice) {
      return NextResponse.json(
        { error: "not_found", message: "Invoice not found" },
        { status: 404 },
      );
    }
    if (profile.isPlatformStaff) {
      await auditCrossTenantAccess(profile, "platform.billing.manage", {
        entity: "invoice",
        entityId: id,
        action: "invoice.read",
        companyId: invoice.company_id,
      });
      return NextResponse.json({ data: invoice });
    }
    if (invoice.company_id !== profile.company_id) {
      return NextResponse.json(
        { error: "forbidden", message: "No access to this invoice." },
        { status: 403 },
      );
    }
    return NextResponse.json({ data: toClientInvoice(invoice) });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[invoices/[id]]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to load invoice." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requirePlatform("platform.billing.manage", { entity: "invoice", entityId: id, action: "invoice.update" });
    const body = await request.json().catch(() => null);
    if (body === null) {
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid JSON body." },
        { status: 400 },
      );
    }
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    const invoice = await updateInvoice(id, parsed.data);
    return NextResponse.json({ data: invoice });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[invoices/[id]]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to update invoice." },
      { status: 500 },
    );
  }
}
