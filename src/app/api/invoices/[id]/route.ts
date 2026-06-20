import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiAuth,
  requireApiRole,
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
    if (profile.role === "super_admin") {
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "get_failed", message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireApiRole(["super_admin"]);
    const { id } = await params;
    const body = await request.json();
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "update_failed", message }, { status: 500 });
  }
}
