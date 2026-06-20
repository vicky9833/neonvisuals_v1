/**
 * Billing Engine — INTERNAL USE ONLY (server-side).
 *
 * Generates GST-compliant tax invoices from orders, records payments (Razorpay
 * + manual), and powers the billing dashboards. SAC code 998396 (event
 * management / corporate gifting services). All financial logic lives here.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrder } from "@/lib/engines/order";
import {
  createPaymentLink as rzpCreatePaymentLink,
  isRazorpayConfigured,
} from "@/lib/services/razorpay";
import { sendPaymentConfirmationEmail } from "@/lib/services/email";

export const SAC_CODE = "998396";
export const DEFAULT_GST_RATE = 18;

export type InvoiceType =
  | "advance"
  | "balance"
  | "standard"
  | "proforma"
  | "credit_note";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled"
  | "refunded";

export type PaymentMethod =
  | "razorpay"
  | "bank_transfer"
  | "upi"
  | "cash"
  | "cheque"
  | "other";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "refunded";

export interface InvoiceLineItem {
  description: string;
  hsnSac: string;
  quantity: number;
  unitPrice: number;
  total: number;
  gstRate: number;
}

export interface Invoice {
  id: string;
  invoice_number: string | null;
  company_id: string;
  order_id: string;
  order_number?: string | null;
  invoice_type: InvoiceType;
  status: InvoiceStatus;
  invoice_date: string;
  due_date: string;
  paid_date: string | null;
  seller_name: string;
  seller_address: string;
  seller_gstin: string | null;
  seller_pan: string | null;
  buyer_name: string;
  buyer_company: string;
  buyer_address: string | null;
  buyer_gstin: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  line_items: InvoiceLineItem[];
  subtotal: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  is_intra_state: boolean;
  total_gst: number;
  grand_total: number;
  amount_in_words: string | null;
  amount_due: number;
  amount_paid: number;
  payment_percentage: number | null;
  razorpay_payment_link_id: string | null;
  razorpay_payment_link_url: string | null;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  notes: string | null;
  internal_notes: string | null;
  terms: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  company_id: string;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  razorpay_payment_id: string | null;
  razorpay_payment_link_id: string | null;
  bank_reference: string | null;
  payment_proof_url: string | null;
  payment_date: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  invoice_number?: string | null;
}

// ---------------------------------------------------------------------------
// GST helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calculateGST(
  subtotal: number,
  isIntraState: boolean,
  rate: number = DEFAULT_GST_RATE,
): {
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  grandTotal: number;
} {
  const totalGst = round2((subtotal * rate) / 100);
  if (isIntraState) {
    const half = round2(totalGst / 2);
    return {
      cgst: half,
      sgst: round2(totalGst - half),
      igst: 0,
      totalGst,
      grandTotal: round2(subtotal + totalGst),
    };
  }
  return {
    cgst: 0,
    sgst: 0,
    igst: totalGst,
    totalGst,
    grandTotal: round2(subtotal + totalGst),
  };
}

/** Karnataka GSTIN state code is 29; otherwise infer from city. */
export function isIntraStateSupply(
  buyerGstin?: string | null,
  city?: string | null,
): boolean {
  if (buyerGstin && buyerGstin.trim().length >= 2) {
    return buyerGstin.trim().slice(0, 2) === "29";
  }
  const c = (city ?? "").toLowerCase();
  return (
    c.includes("bangalore") ||
    c.includes("bengaluru") ||
    c.includes("karnataka") ||
    c.includes("mysore") ||
    c.includes("mysuru") ||
    c.includes("mangalore") ||
    c.includes("hubli") ||
    c.includes("belgaum")
  );
}

// ---------------------------------------------------------------------------
// Number to words (Indian system)
// ---------------------------------------------------------------------------

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty",
  "Ninety",
];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? " " + ONES[o] : ""}`;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let out = "";
  if (h) out += `${ONES[h]} Hundred`;
  if (rest) out += `${h ? " " : ""}${twoDigits(rest)}`;
  return out;
}

/** Converts a whole-rupee integer to Indian-system words (no prefix/suffix). */
function wholeToWords(num: number): string {
  if (num === 0) return "Zero";
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = num % 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${wholeToWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));
  return parts.join(" ").trim();
}

/**
 * "Rupees One Lakh Forty Six Thousand One Hundred Only" with optional paise.
 */
export function numberToWords(amount: number): string {
  const rounded = round2(Math.abs(amount));
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);
  let words = `Rupees ${wholeToWords(rupees)}`;
  if (paise > 0) {
    words += ` and ${twoDigits(paise)} Paise`;
  }
  return `${words} Only`;
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapInvoice(row: any): Invoice {
  return {
    id: row.id,
    invoice_number: row.invoice_number ?? null,
    company_id: row.company_id,
    order_id: row.order_id,
    order_number: row.orders?.order_number ?? null,
    invoice_type: row.invoice_type,
    status: row.status,
    invoice_date: row.invoice_date,
    due_date: row.due_date,
    paid_date: row.paid_date ?? null,
    seller_name: row.seller_name ?? "Neon Visuals",
    seller_address: row.seller_address ?? "Bangalore, Karnataka, India",
    seller_gstin: row.seller_gstin ?? null,
    seller_pan: row.seller_pan ?? null,
    buyer_name: row.buyer_name,
    buyer_company: row.buyer_company,
    buyer_address: row.buyer_address ?? null,
    buyer_gstin: row.buyer_gstin ?? null,
    buyer_email: row.buyer_email ?? null,
    buyer_phone: row.buyer_phone ?? null,
    line_items: (row.line_items ?? []) as InvoiceLineItem[],
    subtotal: Number(row.subtotal ?? 0),
    gst_rate: Number(row.gst_rate ?? DEFAULT_GST_RATE),
    cgst_amount: Number(row.cgst_amount ?? 0),
    sgst_amount: Number(row.sgst_amount ?? 0),
    igst_amount: Number(row.igst_amount ?? 0),
    is_intra_state: Boolean(row.is_intra_state),
    total_gst: Number(row.total_gst ?? 0),
    grand_total: Number(row.grand_total ?? 0),
    amount_in_words: row.amount_in_words ?? null,
    amount_due: Number(row.amount_due ?? 0),
    amount_paid: Number(row.amount_paid ?? 0),
    payment_percentage: row.payment_percentage ?? null,
    razorpay_payment_link_id: row.razorpay_payment_link_id ?? null,
    razorpay_payment_link_url: row.razorpay_payment_link_url ?? null,
    razorpay_payment_id: row.razorpay_payment_id ?? null,
    razorpay_order_id: row.razorpay_order_id ?? null,
    notes: row.notes ?? null,
    internal_notes: row.internal_notes ?? null,
    terms: row.terms ?? null,
    pdf_url: row.pdf_url ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapPayment(row: any): Payment {
  return {
    id: row.id,
    invoice_id: row.invoice_id,
    company_id: row.company_id,
    amount: Number(row.amount ?? 0),
    payment_method: row.payment_method,
    status: row.status,
    razorpay_payment_id: row.razorpay_payment_id ?? null,
    razorpay_payment_link_id: row.razorpay_payment_link_id ?? null,
    bank_reference: row.bank_reference ?? null,
    payment_proof_url: row.payment_proof_url ?? null,
    payment_date: row.payment_date ?? null,
    notes: row.notes ?? null,
    recorded_by: row.recorded_by ?? null,
    created_at: row.created_at,
    invoice_number: row.invoices?.invoice_number ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const INVOICE_SELECT = "*, orders(order_number)";

// ---------------------------------------------------------------------------
// Invoice CRUD
// ---------------------------------------------------------------------------

export interface CreateInvoiceInput {
  orderId: string;
  invoiceType: InvoiceType;
  paymentPercentage: number;
  dueDate: string;
  buyerGstin?: string;
  notes?: string;
  terms?: string;
}

export async function createInvoice(
  input: CreateInvoiceInput,
  createdBy?: string,
): Promise<Invoice> {
  const supa = createAdminClient();
  const order = await getOrder(input.orderId);
  if (!order) throw new Error("Order not found");

  // Company billing details.
  const { data: company } = await supa
    .from("companies")
    .select("name, address, city, gstin, primary_contact_name, primary_contact_email, primary_contact_phone")
    .eq("id", order.company_id)
    .maybeSingle();

  // Build line items from the order.
  const lineItems: InvoiceLineItem[] = order.items.map((item) => ({
    description: `${item.product_name} (${item.product_sku})`,
    hsnSac: SAC_CODE,
    quantity: item.quantity,
    unitPrice: Number(item.unit_price ?? 0),
    total: Number(item.line_total ?? 0),
    gstRate: DEFAULT_GST_RATE,
  }));
  if (Number(order.packaging_total ?? 0) > 0) {
    lineItems.push({
      description: `Packaging — ${order.packaging_tier} (×${order.kit_count})`,
      hsnSac: SAC_CODE,
      quantity: order.kit_count,
      unitPrice: round2(Number(order.packaging_total) / Math.max(1, order.kit_count)),
      total: Number(order.packaging_total),
      gstRate: DEFAULT_GST_RATE,
    });
  }
  if (Number(order.personalisation_total ?? 0) > 0) {
    lineItems.push({
      description: "Personalisation Premium",
      hsnSac: SAC_CODE,
      quantity: order.kit_count,
      unitPrice: round2(Number(order.personalisation_total) / Math.max(1, order.kit_count)),
      total: Number(order.personalisation_total),
      gstRate: DEFAULT_GST_RATE,
    });
  }

  const subtotal = round2(Number(order.grand_total ?? 0));
  const buyerGstin = input.buyerGstin ?? (company?.gstin as string | null) ?? null;
  const intraState = isIntraStateSupply(
    buyerGstin,
    order.delivery_city ?? (company?.city as string | null),
  );
  const gst = calculateGST(subtotal, intraState);
  const pct = input.paymentPercentage;
  const amountDue = round2((gst.grandTotal * pct) / 100);

  const { data, error } = await supa
    .from("invoices")
    .insert({
      company_id: order.company_id,
      order_id: order.id,
      invoice_type: input.invoiceType,
      status: "draft",
      due_date: input.dueDate,
      buyer_name: (company?.primary_contact_name as string) ?? order.company_name ?? "Client",
      buyer_company: (company?.name as string) ?? order.company_name ?? "Client",
      buyer_address: (company?.address as string) ?? order.delivery_address ?? null,
      buyer_gstin: buyerGstin,
      buyer_email: (company?.primary_contact_email as string) ?? null,
      buyer_phone: (company?.primary_contact_phone as string) ?? null,
      line_items: lineItems,
      subtotal,
      gst_rate: DEFAULT_GST_RATE,
      cgst_amount: gst.cgst,
      sgst_amount: gst.sgst,
      igst_amount: gst.igst,
      is_intra_state: intraState,
      total_gst: gst.totalGst,
      grand_total: gst.grandTotal,
      amount_in_words: numberToWords(gst.grandTotal),
      amount_due: amountDue,
      amount_paid: 0,
      payment_percentage: pct,
      notes: input.notes ?? null,
      terms: input.terms ?? null,
      created_by: createdBy ?? null,
    })
    .select(INVOICE_SELECT)
    .single();
  if (error) throw new Error(`Create invoice failed: ${error.message}`);
  return mapInvoice(data);
}

export interface InvoiceUpdate {
  status?: InvoiceStatus;
  dueDate?: string;
  notes?: string;
  internalNotes?: string;
  terms?: string;
  buyerGstin?: string;
  buyerAddress?: string;
}

export async function updateInvoice(
  id: string,
  updates: InvoiceUpdate,
): Promise<Invoice> {
  const supa = createAdminClient();
  const map: Record<string, string> = {
    status: "status",
    dueDate: "due_date",
    notes: "notes",
    internalNotes: "internal_notes",
    terms: "terms",
    buyerGstin: "buyer_gstin",
    buyerAddress: "buyer_address",
  };
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    const col = map[key];
    if (col && value !== undefined) payload[col] = value;
  }
  if (Object.keys(payload).length > 0) {
    const { error } = await supa.from("invoices").update(payload).eq("id", id);
    if (error) throw new Error(`Update invoice failed: ${error.message}`);
  }
  const invoice = await getInvoice(id);
  if (!invoice) throw new Error("Invoice not found");
  return invoice;
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const supa = createAdminClient();
  const { data, error } = await supa
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Get invoice failed: ${error.message}`);
  return data ? mapInvoice(data) : null;
}

export interface ListInvoicesOptions {
  companyId?: string;
  orderId?: string;
  status?: InvoiceStatus;
  dateRange?: { start: string; end: string };
  page?: number;
  pageSize?: number;
}

export async function listInvoices(
  options: ListInvoicesOptions = {},
): Promise<{ invoices: Invoice[]; total: number }> {
  const { page = 1, pageSize = 100 } = options;
  const supa = createAdminClient();
  let query = supa
    .from("invoices")
    .select(INVOICE_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });
  if (options.companyId) query = query.eq("company_id", options.companyId);
  if (options.orderId) query = query.eq("order_id", options.orderId);
  if (options.status) query = query.eq("status", options.status);
  if (options.dateRange) {
    query = query
      .gte("invoice_date", options.dateRange.start)
      .lte("invoice_date", options.dateRange.end);
  }
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);
  const { data, count, error } = await query;
  if (error) throw new Error(`List invoices failed: ${error.message}`);
  return { invoices: (data ?? []).map(mapInvoice), total: count ?? 0 };
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export interface RecordPaymentInput {
  amount: number;
  paymentMethod: PaymentMethod;
  razorpayPaymentId?: string;
  razorpayPaymentLinkId?: string;
  bankReference?: string;
  notes?: string;
  status?: PaymentStatus;
}

export async function recordPayment(
  invoiceId: string,
  payment: RecordPaymentInput,
  recordedBy?: string,
): Promise<Payment> {
  const supa = createAdminClient();
  const invoice = await getInvoice(invoiceId);
  if (!invoice) throw new Error("Invoice not found");

  const { data, error } = await supa
    .from("payments")
    .insert({
      invoice_id: invoiceId,
      company_id: invoice.company_id,
      amount: payment.amount,
      payment_method: payment.paymentMethod,
      status: payment.status ?? "completed",
      razorpay_payment_id: payment.razorpayPaymentId ?? null,
      razorpay_payment_link_id: payment.razorpayPaymentLinkId ?? null,
      bank_reference: payment.bankReference ?? null,
      notes: payment.notes ?? null,
      payment_date: new Date().toISOString(),
      recorded_by: recordedBy ?? null,
    })
    .select("*, invoices(invoice_number)")
    .single();
  if (error) throw new Error(`Record payment failed: ${error.message}`);

  // Recompute invoice paid total from completed payments.
  const { data: paidRows } = await supa
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoiceId)
    .eq("status", "completed");
  const amountPaid = round2(
    (paidRows ?? []).reduce((sum, p) => sum + Number(p.amount ?? 0), 0),
  );

  const fullyPaid = amountPaid >= invoice.amount_due;
  const patch: Record<string, unknown> = {
    amount_paid: amountPaid,
    status: fullyPaid ? "paid" : "partially_paid",
  };
  if (fullyPaid) patch.paid_date = new Date().toISOString().slice(0, 10);
  if (payment.razorpayPaymentId) patch.razorpay_payment_id = payment.razorpayPaymentId;
  await supa.from("invoices").update(patch).eq("id", invoiceId);

  await recomputeOrderPaymentStatus(invoice.order_id);

  // Fire-and-forget payment confirmation email to the client.
  void (async () => {
    const remaining = Math.max(0, invoice.amount_due - amountPaid);
    if (invoice.buyer_email) {
      await sendPaymentConfirmationEmail({
        to: invoice.buyer_email,
        clientName: invoice.buyer_name,
        invoiceNumber: invoice.invoice_number ?? "",
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        remainingBalance: remaining,
      });
    }
  })().catch((err) => console.error("[Email] Payment confirmation failed:", err));

  return mapPayment(data);
}

/** Recomputes orders.payment_status from this order's invoice payments. */
async function recomputeOrderPaymentStatus(orderId: string): Promise<void> {
  const supa = createAdminClient();
  const { data: invoices } = await supa
    .from("invoices")
    .select("invoice_type, amount_due, amount_paid, status")
    .eq("order_id", orderId)
    .neq("status", "cancelled");
  const rows = invoices ?? [];
  const totalDue = rows.reduce((s, r) => s + Number(r.amount_due ?? 0), 0);
  const totalPaid = rows.reduce((s, r) => s + Number(r.amount_paid ?? 0), 0);
  const hasPaidAdvance = rows.some(
    (r) => r.invoice_type === "advance" && r.status === "paid",
  );

  let status: string;
  if (totalPaid <= 0) status = "pending";
  else if (totalDue > 0 && totalPaid >= totalDue) status = "fully_paid";
  else if (hasPaidAdvance) status = "advance_received";
  else status = "partially_paid";

  await supa.from("orders").update({ payment_status: status }).eq("id", orderId);
}

export async function getPayments(invoiceId: string): Promise<Payment[]> {
  const supa = createAdminClient();
  const { data, error } = await supa
    .from("payments")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Get payments failed: ${error.message}`);
  return (data ?? []).map(mapPayment);
}

// ---------------------------------------------------------------------------
// Razorpay payment links + webhook
// ---------------------------------------------------------------------------

export async function createInvoicePaymentLink(
  invoiceId: string,
): Promise<{ url: string; linkId: string }> {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay is not configured.");
  }
  const supa = createAdminClient();
  const invoice = await getInvoice(invoiceId);
  if (!invoice) throw new Error("Invoice not found");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = await rzpCreatePaymentLink({
    amount: Math.round(invoice.amount_due * 100), // paise
    currency: "INR",
    description: `Invoice ${invoice.invoice_number} — ${invoice.invoice_type} payment`,
    customerName: invoice.buyer_name,
    customerEmail: invoice.buyer_email ?? undefined,
    customerPhone: invoice.buyer_phone ?? undefined,
    invoiceNumber: invoice.invoice_number ?? invoice.id,
    callbackUrl: `${appUrl}/api/payments/callback?invoice=${invoice.id}`,
  });

  await supa
    .from("invoices")
    .update({
      razorpay_payment_link_id: link.id,
      razorpay_payment_link_url: link.short_url,
      status: invoice.status === "draft" ? "sent" : invoice.status,
    })
    .eq("id", invoiceId);

  return { url: link.short_url, linkId: link.id };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function handleRazorpayWebhook(payload: any): Promise<void> {
  const event = payload?.event as string | undefined;
  if (event !== "payment_link.paid") return;

  const supa = createAdminClient();
  const linkEntity = payload?.payload?.payment_link?.entity;
  const paymentEntity = payload?.payload?.payment?.entity;
  const linkId = linkEntity?.id as string | undefined;
  if (!linkId) return;

  const { data: invoice } = await supa
    .from("invoices")
    .select("id, amount_due")
    .eq("razorpay_payment_link_id", linkId)
    .maybeSingle();
  if (!invoice) return;

  // Avoid double-recording the same payment.
  const paymentId = paymentEntity?.id as string | undefined;
  if (paymentId) {
    const { data: existing } = await supa
      .from("payments")
      .select("id")
      .eq("razorpay_payment_id", paymentId)
      .maybeSingle();
    if (existing) return;
  }

  const amountPaise = Number(
    paymentEntity?.amount ?? linkEntity?.amount_paid ?? 0,
  );
  const amount = amountPaise > 0 ? amountPaise / 100 : Number(invoice.amount_due);

  await recordPayment(invoice.id as string, {
    amount,
    paymentMethod: "razorpay",
    razorpayPaymentId: paymentId,
    razorpayPaymentLinkId: linkId,
    status: "completed",
    notes: "Razorpay payment link paid",
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface BillingStats {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  overdueAmount: number;
  overdueCount: number;
  invoicesByStatus: Record<string, number>;
  collectionRate: number;
  recentPayments: Payment[];
}

export async function getBillingStats(companyId?: string): Promise<BillingStats> {
  const supa = createAdminClient();

  let invQuery = supa
    .from("invoices")
    .select("status, amount_due, amount_paid, due_date");
  if (companyId) invQuery = invQuery.eq("company_id", companyId);
  const { data: invoices, error } = await invQuery;
  if (error) throw new Error(`Billing stats failed: ${error.message}`);

  const rows = invoices ?? [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalInvoiced = 0;
  let totalCollected = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  const invoicesByStatus: Record<string, number> = {};

  for (const r of rows) {
    const status = (r.status as string) ?? "draft";
    if (status === "cancelled") continue;
    invoicesByStatus[status] = (invoicesByStatus[status] ?? 0) + 1;
    const due = Number(r.amount_due ?? 0);
    const paid = Number(r.amount_paid ?? 0);
    totalInvoiced += due;
    totalCollected += paid;
    const outstanding = due - paid;
    if (
      outstanding > 0 &&
      r.due_date &&
      new Date(r.due_date as string) < today &&
      status !== "paid"
    ) {
      overdueAmount += outstanding;
      overdueCount += 1;
    }
  }

  let recentQuery = supa
    .from("payments")
    .select("*, invoices(invoice_number)")
    .eq("status", "completed")
    .order("payment_date", { ascending: false })
    .limit(10);
  if (companyId) recentQuery = recentQuery.eq("company_id", companyId);
  const { data: recent } = await recentQuery;

  return {
    totalInvoiced: round2(totalInvoiced),
    totalCollected: round2(totalCollected),
    totalOutstanding: round2(totalInvoiced - totalCollected),
    overdueAmount: round2(overdueAmount),
    overdueCount,
    invoicesByStatus,
    collectionRate:
      totalInvoiced > 0
        ? Math.round((totalCollected / totalInvoiced) * 100)
        : 0,
    recentPayments: (recent ?? []).map(mapPayment),
  };
}

// ---------------------------------------------------------------------------
// Client projection (strip internal-only fields)
// ---------------------------------------------------------------------------

export interface ClientInvoice {
  id: string;
  invoice_number: string | null;
  order_id: string;
  order_number?: string | null;
  invoice_type: InvoiceType;
  status: InvoiceStatus;
  invoice_date: string;
  due_date: string;
  paid_date: string | null;
  grand_total: number;
  amount_due: number;
  amount_paid: number;
  payment_percentage: number | null;
  razorpay_payment_link_url: string | null;
  pdf_url: string | null;
  notes: string | null;
}

/** Clients see amounts (due/paid/total) but never internal_notes. */
export function toClientInvoice(invoice: Invoice): ClientInvoice {
  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    order_id: invoice.order_id,
    order_number: invoice.order_number,
    invoice_type: invoice.invoice_type,
    status: invoice.status,
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    paid_date: invoice.paid_date,
    grand_total: invoice.grand_total,
    amount_due: invoice.amount_due,
    amount_paid: invoice.amount_paid,
    payment_percentage: invoice.payment_percentage,
    razorpay_payment_link_url: invoice.razorpay_payment_link_url,
    pdf_url: invoice.pdf_url,
    notes: invoice.notes,
  };
}
