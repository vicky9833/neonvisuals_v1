import { ArrowRight, Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { ClientInvoice } from "@/lib/engines/billing";
import { INVOICE_STATUS_META, INVOICE_TYPE_LABEL } from "./billing-meta";

interface ClientInvoiceCardProps {
  invoice: ClientInvoice;
}

/** Client-facing invoice card. Shows amounts (allowed) but no internal data. */
export function ClientInvoiceCard({ invoice }: ClientInvoiceCardProps) {
  const meta = INVOICE_STATUS_META[invoice.status];
  const payable = invoice.status !== "paid" && invoice.status !== "cancelled";

  return (
    <article className="flex flex-col rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-numbers font-semibold text-navy">
            {invoice.invoice_number}
          </p>
          <p className="text-sm text-[#6B7280]">
            {INVOICE_TYPE_LABEL[invoice.invoice_type]} Payment
            {invoice.order_number ? ` · ${invoice.order_number}` : ""}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}
        >
          <span className={`size-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-[#9CA3AF]">Amount due</dt>
          <dd className="font-numbers font-semibold text-navy">
            {formatCurrency(invoice.amount_due)}
          </dd>
        </div>
        {invoice.amount_paid > 0 && (
          <div className="flex justify-between">
            <dt className="text-[#9CA3AF]">Paid</dt>
            <dd className="font-numbers text-green-700">
              {formatCurrency(invoice.amount_paid)}
            </dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-[#9CA3AF]">Due date</dt>
          <dd className="text-navy">{formatDate(invoice.due_date)}</dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <a
          href={`/api/invoices/${invoice.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-navy hover:underline"
        >
          <Download className="size-4" /> Download Invoice PDF
        </a>
        {payable &&
          (invoice.razorpay_payment_link_url ? (
            <a
              href={invoice.razorpay_payment_link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-navy transition-opacity hover:opacity-90"
            >
              Pay Now <ArrowRight className="size-3.5" />
            </a>
          ) : (
            <span className="ml-auto text-xs text-[#9CA3AF]">
              Payment link will be shared shortly
            </span>
          ))}
      </div>
    </article>
  );
}
