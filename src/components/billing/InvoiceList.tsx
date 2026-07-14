"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { Invoice, InvoiceStatus } from "@/lib/engines/billing";
import { INVOICE_STATUS_META, INVOICE_TYPE_LABEL } from "./billing-meta";
import { InvoiceDetail } from "./InvoiceDetail";

interface InvoiceListProps {
  initialInvoices: Invoice[];
  razorpayConfigured: boolean;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  ...(Object.keys(INVOICE_STATUS_META) as InvoiceStatus[]).map((s) => ({
    value: s,
    label: INVOICE_STATUS_META[s].label,
  })),
];

export function InvoiceList({
  initialInvoices,
  razorpayConfigured,
}: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (res.ok) {
        const body = await res.json();
        setInvoices(body.data.invoices as Invoice[]);
      }
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the open detail dialog in sync after a payment/link change.
  function refresh() {
    load();
    if (selected) {
      fetch(`/api/invoices/${selected.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => b?.data && setSelected(b.data as Invoice))
        .catch(() => {});
    }
  }

  return (
    <div className="space-y-4">
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="overflow-x-auto rounded-card border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead className="hidden md:table-cell">Company</TableHead>
              <TableHead className="hidden lg:table-cell">Order #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Due</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {loading ? "Loading…" : "No invoices yet."}
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => {
                const meta = INVOICE_STATUS_META[inv.status];
                return (
                  <TableRow
                    key={inv.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(inv)}
                  >
                    <TableCell>
                      <p className="font-numbers font-medium text-navy">
                        {inv.invoice_number}
                      </p>
                      <p className="text-xs text-[#9CA3AF]">
                        {formatDate(inv.invoice_date)}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-navy">
                      {inv.buyer_company}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-[#6B7280]">
                      {inv.order_number ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {INVOICE_TYPE_LABEL[inv.invoice_type]}
                    </TableCell>
                    <TableCell className="font-numbers text-right text-sm text-navy">
                      {formatCurrency(inv.amount_due)}
                    </TableCell>
                    <TableCell className="font-numbers text-right text-sm text-[#6B7280]">
                      {formatCurrency(inv.amount_paid)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}
                      >
                        <span className={`size-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice</DialogTitle>
          </DialogHeader>
          {selected && (
            <InvoiceDetail
              invoice={selected}
              razorpayConfigured={razorpayConfigured}
              onChanged={refresh}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
