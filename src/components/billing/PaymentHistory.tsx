import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { Payment } from "@/lib/engines/billing";
import { PAYMENT_METHOD_LABEL } from "./billing-meta";

interface PaymentHistoryProps {
  payments: Payment[];
  /** Hide the reference column for client-facing views. */
  showReference?: boolean;
}

export function PaymentHistory({
  payments,
  showReference = true,
}: PaymentHistoryProps) {
  if (payments.length === 0) {
    return <p className="text-sm text-[#9CA3AF]">No payments recorded yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Method</TableHead>
            {showReference && (
              <TableHead className="hidden sm:table-cell">Reference</TableHead>
            )}
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="text-sm">
                {p.payment_date ? formatDate(p.payment_date) : "-"}
              </TableCell>
              <TableCell className="font-numbers text-sm text-navy">
                {p.invoice_number ?? "-"}
              </TableCell>
              <TableCell className="font-numbers text-right text-sm text-navy">
                {formatCurrency(p.amount)}
              </TableCell>
              <TableCell className="text-sm text-[#6B7280]">
                {PAYMENT_METHOD_LABEL[p.payment_method] ?? p.payment_method}
              </TableCell>
              {showReference && (
                <TableCell className="hidden sm:table-cell text-sm text-[#6B7280]">
                  {p.bank_reference ?? p.razorpay_payment_id ?? "-"}
                </TableCell>
              )}
              <TableCell>
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  {p.status}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
