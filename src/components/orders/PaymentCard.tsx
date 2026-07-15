"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type {
  Order,
  OrderPaymentStatus,
  OrderUpdate,
} from "@/lib/engines/order";
import { PAYMENT_STATUS_LABEL } from "./order-status";

interface PaymentCardProps {
  order: Order;
  onSave: (updates: OrderUpdate) => Promise<void>;
}

const PAYMENT_STATUSES: OrderPaymentStatus[] = [
  "pending",
  "advance_received",
  "partially_paid",
  "fully_paid",
  "refunded",
];

/** Payment tracking (admin only). */
export function PaymentCard({ order, onSave }: PaymentCardProps) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<OrderPaymentStatus>(
    order.payment_status,
  );
  const [advance, setAdvance] = useState(
    order.advance_amount != null ? String(order.advance_amount) : "",
  );
  const [advanceDate, setAdvanceDate] = useState(order.advance_date ?? "");
  const [balance, setBalance] = useState(
    order.balance_amount != null ? String(order.balance_amount) : "",
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await onSave({
        paymentStatus: status,
        advanceAmount: advance ? Number(advance) : null,
        advanceDate: advanceDate || null,
        balanceAmount: balance ? Number(balance) : null,
      });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading flex items-center gap-2 text-base font-semibold text-navy">
          <Wallet className="size-4 text-gold" /> Payment
        </h2>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-navy">
          {PAYMENT_STATUS_LABEL[order.payment_status]}
        </span>
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Payment status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as OrderPaymentStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PAYMENT_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="advance">Advance (₹)</Label>
              <Input
                id="advance"
                type="number"
                value={advance}
                onChange={(e) => setAdvance(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="advanceDate">Advance date</Label>
              <Input
                id="advanceDate"
                type="date"
                value={advanceDate}
                onChange={(e) => setAdvanceDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="balance">Balance due (₹)</Label>
            <Input
              id="balance"
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Record Payment"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(false)}
              disabled={busy}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[#6B7280]">Advance</dt>
              <dd className="font-numbers text-navy">
                {order.advance_amount != null
                  ? formatCurrency(Number(order.advance_amount))
                  : "-"}
                {order.advance_date
                  ? ` · ${formatDate(order.advance_date)}`
                  : ""}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6B7280]">Balance</dt>
              <dd className="font-numbers text-navy">
                {order.balance_amount != null
                  ? formatCurrency(Number(order.balance_amount))
                  : "-"}
              </dd>
            </div>
          </dl>
          <Button
            size="sm"
            variant="outline"
            className="mt-4 w-full"
            onClick={() => setEditing(true)}
          >
            Record Payment
          </Button>
        </>
      )}
    </section>
  );
}
