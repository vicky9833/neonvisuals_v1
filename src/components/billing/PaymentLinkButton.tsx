"use client";

import { useState } from "react";
import { Copy, ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Invoice } from "@/lib/engines/billing";

interface PaymentLinkButtonProps {
  invoice: Pick<
    Invoice,
    "id" | "razorpay_payment_link_url" | "status"
  >;
  razorpayConfigured: boolean;
  onUpdated: () => void;
}

/** Creates / shares a Razorpay payment link. Hidden when Razorpay is off and
 * no link exists yet. */
export function PaymentLinkButton({
  invoice,
  razorpayConfigured,
  onUpdated,
}: PaymentLinkButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = invoice.razorpay_payment_link_url;

  async function createLink() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payment-link`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.message ?? "Could not create link.");
        return;
      }
      onUpdated();
    } finally {
      setBusy(false);
    }
  }

  if (url) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1.5 size-4" /> Open Link
          </a>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigator.clipboard?.writeText(url)}
        >
          <Copy className="mr-1.5 size-4" /> Copy
        </Button>
      </div>
    );
  }

  if (!razorpayConfigured) {
    return (
      <p className="text-xs text-[#9CA3AF]">
        Razorpay not configured — add API keys to enable payment links.
      </p>
    );
  }

  return (
    <div>
      <Button variant="outline" size="sm" onClick={createLink} disabled={busy}>
        <Link2 className="mr-1.5 size-4" />
        {busy ? "Creating…" : "Create Payment Link"}
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
