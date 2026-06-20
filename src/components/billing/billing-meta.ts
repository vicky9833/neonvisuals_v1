import type { InvoiceStatus, InvoiceType } from "@/lib/engines/billing";

export const INVOICE_STATUS_META: Record<
  InvoiceStatus,
  { label: string; badge: string; dot: string }
> = {
  draft: { label: "Draft", badge: "bg-gray-100 text-gray-700 border-gray-200", dot: "bg-gray-400" },
  sent: { label: "Sent", badge: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  viewed: { label: "Viewed", badge: "bg-cyan-50 text-cyan-700 border-cyan-200", dot: "bg-cyan-500" },
  partially_paid: {
    label: "Partially Paid",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  paid: { label: "Paid", badge: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
  overdue: { label: "Overdue", badge: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  cancelled: { label: "Cancelled", badge: "bg-gray-100 text-gray-500 border-gray-200", dot: "bg-gray-400" },
  refunded: { label: "Refunded", badge: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
};

export const INVOICE_TYPE_LABEL: Record<InvoiceType, string> = {
  advance: "Advance",
  balance: "Balance",
  standard: "Standard",
  proforma: "Proforma",
  credit_note: "Credit Note",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  razorpay: "Razorpay",
  bank_transfer: "Bank Transfer",
  upi: "UPI",
  cash: "Cash",
  cheque: "Cheque",
  other: "Other",
};

/** Compact ₹ — ₹12.4L / ₹89K. */
export function compactRs(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${Math.round(n)}`;
}
