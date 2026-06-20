"use client";

import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils/format";
import type {
  BillingStats,
  ClientInvoice,
  Payment,
} from "@/lib/engines/billing";
import { ClientInvoiceCard } from "./ClientInvoiceCard";
import { PaymentHistory } from "./PaymentHistory";

interface ClientBillingViewProps {
  initialInvoices: ClientInvoice[];
  initialStats: BillingStats;
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#EDE9E3] bg-white p-5 shadow-sm">
      <p className="font-numbers text-2xl font-bold text-navy">{value}</p>
      <p className="mt-0.5 text-sm text-[#6B7280]">{label}</p>
    </div>
  );
}

export function ClientBillingView({
  initialInvoices,
  initialStats,
}: ClientBillingViewProps) {
  const [invoices, setInvoices] = useState<ClientInvoice[]>(initialInvoices);
  const [stats, setStats] = useState<BillingStats>(initialStats);
  const [loading, setLoading] = useState(initialInvoices.length === 0);

  useEffect(() => {
    Promise.all([
      fetch("/api/invoices").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/invoices/stats").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([inv, st]) => {
        if (inv?.data?.invoices) setInvoices(inv.data.invoices as ClientInvoice[]);
        if (st?.data) setStats(st.data as BillingStats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const payments: Payment[] = stats.recentPayments ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="Total Invoiced" value={formatCurrency(stats.totalInvoiced)} />
        <Summary label="Paid" value={formatCurrency(stats.totalCollected)} />
        <Summary label="Outstanding" value={formatCurrency(stats.totalOutstanding)} />
      </div>

      <section>
        <h2 className="font-heading mb-3 text-lg font-semibold text-navy">
          Invoices
        </h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt className="size-10" />}
            title="No invoices yet"
            description="Invoices for your orders will appear here. You can download PDFs and pay online once they're issued."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {invoices.map((inv) => (
              <ClientInvoiceCard key={inv.id} invoice={inv} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-heading mb-3 text-lg font-semibold text-navy">
          Your Payments
        </h2>
        <PaymentHistory payments={payments} showReference={false} />
      </section>
    </div>
  );
}
