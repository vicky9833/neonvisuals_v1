"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CompanyOption } from "@/lib/engines/order";

interface QuoteOption {
  id: string;
  quote_number: string;
  client_company: string;
}

interface FromQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: CompanyOption[];
}

/** Converts an accepted quote into an order. */
export function FromQuoteDialog({
  open,
  onOpenChange,
  companies,
}: FromQuoteDialogProps) {
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [quoteId, setQuoteId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuoteId("");
    setCompanyId("");
    setError(null);
    fetch("/api/quotes")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (Array.isArray(body?.data)) {
          setQuotes(
            body.data.map((q: Record<string, unknown>) => ({
              id: q.id as string,
              quote_number: (q.quote_number as string) ?? "—",
              client_company: (q.client_company as string) ?? "",
            })),
          );
        }
      })
      .catch(() => setQuotes([]));
  }, [open]);

  async function convert() {
    if (!quoteId) return setError("Select a quote.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/from-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId,
          companyId: companyId || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(
          body?.error === "no_company"
            ? "Couldn't match a company automatically — pick one below."
            : (body?.message ?? "Conversion failed."),
        );
        return;
      }
      onOpenChange(false);
      router.push(`/admin/orders/${body.data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convert Quote to Order</DialogTitle>
          <DialogDescription>
            Copies products and pricing from the quote and marks it accepted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Quote *</Label>
            <Select value={quoteId} onValueChange={setQuoteId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a quote" />
              </SelectTrigger>
              <SelectContent>
                {quotes.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.quote_number}
                    {q.client_company ? ` — ${q.client_company}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Company (optional override)</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Auto-match by company name" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button onClick={convert} disabled={busy}>
              {busy ? "Converting…" : "Convert"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
