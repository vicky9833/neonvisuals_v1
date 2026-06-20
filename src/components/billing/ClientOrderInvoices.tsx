"use client";

import { useEffect, useState } from "react";
import type { ClientInvoice } from "@/lib/engines/billing";
import { ClientInvoiceCard } from "./ClientInvoiceCard";

/** Linked invoices for the client order detail page. Hidden when none exist. */
export function ClientOrderInvoices({ orderId }: { orderId: string }) {
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);

  useEffect(() => {
    fetch(`/api/invoices?orderId=${orderId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => b?.data?.invoices && setInvoices(b.data.invoices as ClientInvoice[]))
      .catch(() => {});
  }, [orderId]);

  if (invoices.length === 0) return null;

  return (
    <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
      <h2 className="font-heading mb-4 text-base font-semibold text-navy">
        Invoices
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {invoices.map((inv) => (
          <ClientInvoiceCard key={inv.id} invoice={inv} />
        ))}
      </div>
    </section>
  );
}
