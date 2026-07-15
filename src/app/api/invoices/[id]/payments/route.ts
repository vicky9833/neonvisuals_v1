import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiAuth,
  requireApiRole,
  apiAuthErrorResponse,
} from "@/lib/api-auth";
import { getInvoice, getPayments, recordPayment } from "@/lib/engines/billing";

export const runtime = "nodejs";

const schema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum([
    "razorpay",
    "bank_transfer",
    "upi",
    "cash",
    "cheque",
    "other",
  ]),
  razorpayPaymentId: z.string().optional(),
  bankReference: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireApiAuth();
    const { id } = await params;
    if (profile.role !== "super_admin") {
      const invoice = await getInvoice(id);
      if (!invoice || invoice.company_id !== profile.company_id) {
        return NextResponse.json(
          { error: "forbidden", message: "No access to this invoice." },
          { status: 403 },
        );
      }
    }
    const payments = await getPayments(id);
    return NextResponse.json({ data: payments });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[invoices/[id]/payments]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to load payments." },
      { status: 500 },
    );
  }
}

// POST - record a manual payment (super_admin only).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireApiRole(["super_admin"]);
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (body === null) {
      return NextResponse.json(
        { error: "invalid_input", message: "Invalid JSON body." },
        { status: 400 },
      );
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: parsed.error.message },
        { status: 400 },
      );
    }
    const payment = await recordPayment(id, parsed.data, profile.id);
    return NextResponse.json({ data: payment }, { status: 201 });
  } catch (err) {
    const authResponse = apiAuthErrorResponse(err);
    if (authResponse) return authResponse;
    console.error("[invoices/[id]/payments]", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to record payment." },
      { status: 500 },
    );
  }
}
