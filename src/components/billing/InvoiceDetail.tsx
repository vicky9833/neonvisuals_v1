"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { Invoice, Payment } from "@/lib/engines/billing";
import { INVOICE_STATUS_META, INVOICE_TYPE_LABEL } from "./billing-meta";
import { InvoiceActions } from "./InvoiceActions";
import { PaymentHistory } from "./PaymentHistory";

interface InvoiceDetailProps {
  invoice: Invoice;
  razorpayConfigured: boolean;
  onChanged: () => void;
}

export function InvoiceDetail({
  invoice,
  razorpayConfigured,
  onChanged,
}: InvoiceDetailProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const meta = INVOICE_STATUS_META[invoice.status];

  useEffect(() => {
    fetch(`/api/invoices/${invoice.id}/payments`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => b?.data && setPayments(b.data as Payment[]))
      .catch(() => {});
  }, [invoice.id, invoice.amount_paid]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-numbers text-lg font-bold text-navy">
            {invoice.invoice_number}
          </p>
          <p className="text-sm text-[#6B7280]">
            {INVOICE_TYPE_LABEL[invoice.invoice_type]} ·{" "}
            <Link
              href={`/ops/orders/${invoice.order_id}`}
              className="text-gold hover:underline"
            >
              {invoice.order_number ?? "Order"}
            </Link>
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}
        >
          {meta.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase text-gold">Bill To</p>
          <p className="font-medium text-navy">{invoice.buyer_company}</p>
          <p className="text-[#6B7280]">{invoice.buyer_name}</p>
          {invoice.buyer_gstin && (
            <p className="text-[#6B7280]">GSTIN: {invoice.buyer_gstin}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-[#9CA3AF]">Invoice date</p>
          <p className="text-navy">{formatDate(invoice.invoice_date)}</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">Due date</p>
          <p className="text-navy">{formatDate(invoice.due_date)}</p>
        </div>
      </div>

      {/* Line items */}
      <div className="overflow-hidden rounded-card border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs text-[#6B7280]">
            <tr>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-right">Rate</th>
              <th className="p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.line_items.map((item, idx) => (
              <tr key={idx} className="border-t border-border">
                <td className="p-2 text-navy">{item.description}</td>
                <td className="p-2 text-right font-numbers">{item.quantity}</td>
                <td className="p-2 text-right font-numbers">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="p-2 text-right font-numbers">
                  {formatCurrency(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
        <Row label="Subtotal" value={formatCurrency(invoice.subtotal)} />
        {invoice.is_intra_state ? (
          <>
            <Row
              label={`CGST @ ${invoice.gst_rate / 2}%`}
              value={formatCurrency(invoice.cgst_amount)}
            />
            <Row
              label={`SGST @ ${invoice.gst_rate / 2}%`}
              value={formatCurrency(invoice.sgst_amount)}
            />
          </>
        ) : (
          <Row
            label={`IGST @ ${invoice.gst_rate}%`}
            value={formatCurrency(invoice.igst_amount)}
          />
        )}
        <div className="flex justify-between border-t border-navy pt-1.5 font-semibold text-navy">
          <span>Grand Total</span>
          <span className="font-numbers">{formatCurrency(invoice.grand_total)}</span>
        </div>
        <Row
          label="Amount Due"
          value={formatCurrency(invoice.amount_due)}
          strong
        />
        <Row label="Amount Paid" value={formatCurrency(invoice.amount_paid)} />
      </div>

      {invoice.amount_in_words && (
        <p className="rounded-card border border-border bg-secondary/40 p-3 text-xs text-[#6B7280]">
          {invoice.amount_in_words}
        </p>
      )}

      <InvoiceActions
        invoice={invoice}
        razorpayConfigured={razorpayConfigured}
        onChanged={onChanged}
      />

      <div>
        <h4 className="mb-2 text-sm font-semibold text-navy">Payments</h4>
        <PaymentHistory payments={payments} />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={strong ? "font-medium text-navy" : "text-[#6B7280]"}>
        {label}
      </span>
      <span className={`font-numbers ${strong ? "font-semibold text-navy" : "text-[#2D2D2D]"}`}>
        {value}
      </span>
    </div>
  );
}
