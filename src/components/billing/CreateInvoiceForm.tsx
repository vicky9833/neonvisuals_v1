"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { InvoiceType } from "@/lib/engines/billing";

interface CreateInvoiceFormProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const TYPES: { value: InvoiceType; label: string; pct: number }[] = [
  { value: "advance", label: "Advance (50%)", pct: 50 },
  { value: "balance", label: "Balance (50%)", pct: 50 },
  { value: "standard", label: "Full (100%)", pct: 100 },
  { value: "proforma", label: "Proforma (100%)", pct: 100 },
];

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 15);
  return d.toISOString().slice(0, 10);
}

export function CreateInvoiceForm({
  orderId,
  open,
  onOpenChange,
  onCreated,
}: CreateInvoiceFormProps) {
  const [type, setType] = useState<InvoiceType>("advance");
  const [pct, setPct] = useState("50");
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [buyerGstin, setBuyerGstin] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeType(value: InvoiceType) {
    setType(value);
    const def = TYPES.find((t) => t.value === value);
    if (def) setPct(String(def.pct));
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          invoiceType: type,
          paymentPercentage: Number(pct) || 100,
          dueDate,
          buyerGstin: buyerGstin.trim() || undefined,
          notes: notes.trim() || undefined,
          terms: terms.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.message ?? "Failed to create invoice.");
        return;
      }
      onOpenChange(false);
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Invoice</DialogTitle>
          <DialogDescription>
            Pricing and GST are calculated automatically from the order.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Invoice type</Label>
            <Select value={type} onValueChange={(v) => changeType(v as InvoiceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="pct">Payment %</Label>
              <Input
                id="pct"
                type="number"
                min={1}
                max={100}
                value={pct}
                onChange={(e) => setPct(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="due">Due date</Label>
              <Input
                id="due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="gstin">Buyer GSTIN (optional)</Label>
            <Input
              id="gstin"
              value={buyerGstin}
              onChange={(e) => setBuyerGstin(e.target.value)}
              placeholder="29XXXXXXXXXXXZX"
            />
            <p className="text-xs text-[#9CA3AF]">
              GSTIN starting with 29 (Karnataka) is treated as intra-state
              (CGST+SGST).
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="terms">Payment terms</Label>
            <Input
              id="terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="e.g. 50% advance, balance before dispatch"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="inv-notes">Notes</Label>
            <Textarea
              id="inv-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Generating…" : "Generate Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
