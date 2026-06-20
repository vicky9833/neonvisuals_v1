"use client";

import { useState } from "react";
import { Download, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Invoice } from "@/lib/engines/billing";
import { PaymentForm } from "./PaymentForm";
import { PaymentLinkButton } from "./PaymentLinkButton";

interface InvoiceActionsProps {
  invoice: Invoice;
  razorpayConfigured: boolean;
  onChanged: () => void;
  layout?: "row" | "stack";
}

/** Admin invoice actions: download PDF, payment link, record payment. */
export function InvoiceActions({
  invoice,
  razorpayConfigured,
  onChanged,
  layout = "row",
}: InvoiceActionsProps) {
  const [showPayment, setShowPayment] = useState(false);
  const remaining = Math.max(0, invoice.amount_due - invoice.amount_paid);
  const fullyPaid = invoice.status === "paid";

  return (
    <div
      className={
        layout === "stack"
          ? "flex flex-col gap-2"
          : "flex flex-wrap items-center gap-2"
      }
    >
      <Button asChild variant="outline" size="sm">
        <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
          <Download className="mr-1.5 size-4" /> PDF
        </a>
      </Button>

      {!fullyPaid && (
        <PaymentLinkButton
          invoice={invoice}
          razorpayConfigured={razorpayConfigured}
          onUpdated={onChanged}
        />
      )}

      {!fullyPaid && (
        <Button variant="outline" size="sm" onClick={() => setShowPayment(true)}>
          <IndianRupee className="mr-1.5 size-4" /> Record Payment
        </Button>
      )}

      <PaymentForm
        invoiceId={invoice.id}
        defaultAmount={remaining}
        open={showPayment}
        onOpenChange={setShowPayment}
        onRecorded={onChanged}
      />
    </div>
  );
}
