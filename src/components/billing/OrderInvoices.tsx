"use client";

import { useCallback, useEffect, useState } from "react";
import { FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { Invoice } from "@/lib/engines/billing";
import { INVOICE_STATUS_META, INVOICE_TYPE_LABEL } from "./billing-meta";
import { CreateInvoiceForm } from "./CreateInvoiceForm";
import { InvoiceDetail } from "./InvoiceDetail";

interface OrderInvoicesProps {
  orderId: string;
  razorpayConfigured: boolean;
}

/** Invoices section for the admin order detail right column. */
export function OrderInvoices({ orderId, razorpayConfigured }: OrderInvoicesProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/invoices?orderId=${orderId}`);
    if (res.ok) {
      const body = await res.json();
      setInvoices(body.data.invoices as Invoice[]);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

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
    <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold text-navy">
          Invoices ({invoices.length})
        </h2>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
          <FilePlus className="mr-1.5 size-4" /> Generate
        </Button>
      </div>

      {invoices.length === 0 ? (
        <p className="text-sm text-[#9CA3AF]">No invoices for this order yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {invoices.map((inv) => {
            const meta = INVOICE_STATUS_META[inv.status];
            return (
              <li key={inv.id}>
                <button
                  type="button"
                  onClick={() => setSelected(inv)}
                  className="flex w-full items-center justify-between py-2.5 text-left"
                >
                  <div>
                    <p className="font-numbers text-sm font-medium text-navy">
                      {inv.invoice_number}
                    </p>
                    <p className="text-xs text-[#9CA3AF]">
                      {INVOICE_TYPE_LABEL[inv.invoice_type]} · due{" "}
                      {formatDate(inv.due_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-numbers text-sm text-navy">
                      {formatCurrency(inv.amount_due)}
                    </p>
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.badge}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <CreateInvoiceForm
        orderId={orderId}
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={refresh}
      />

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
    </section>
  );
}
