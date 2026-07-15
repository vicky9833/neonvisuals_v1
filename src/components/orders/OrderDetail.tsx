"use client";

import { useState } from "react";
import Image from "next/image";
import Papa from "papaparse";
import { ArrowRight, PackageCheck, Ban, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/format";
import { getProductBySku } from "@/lib/catalog";
import { ORDER_TRANSITIONS } from "@/lib/engines/order-constants";
import type {
  Order,
  OrderStatus,
  OrderUpdate,
  RecipientDeliveryStatus,
  RecipientInput,
} from "@/lib/engines/order";
import { ORDER_STATUS_META } from "./order-status";
import { OrderStatusPipeline } from "./OrderStatusPipeline";
import { OrderSummaryCard } from "./OrderSummaryCard";
import { PaymentCard } from "./PaymentCard";
import { DeliveryCard } from "./DeliveryCard";
import { RecipientTable } from "./RecipientTable";
import { RecipientUpload } from "./RecipientUpload";
import { StatusHistory } from "./StatusHistory";
import { OrderInvoices } from "@/components/billing/OrderInvoices";

interface OrderDetailProps {
  initialOrder: Order;
  razorpayConfigured?: boolean;
}

export function OrderDetail({
  initialOrder,
  razorpayConfigured = false,
}: OrderDetailProps) {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [showAddRecipients, setShowAddRecipients] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const meta = ORDER_STATUS_META[order.status];
  const nextStatuses = (ORDER_TRANSITIONS[order.status] ?? []).filter(
    (s) => s !== "cancelled",
  );

  async function reload() {
    const res = await fetch(`/api/orders/${order.id}`);
    if (res.ok) {
      const body = await res.json();
      setOrder(body.data as Order);
    }
  }

  async function advance(newStatus: OrderStatus, notes?: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, notes }),
      });
      const body = await res.json();
      if (!res.ok) {
        setToast(body?.message ?? "Status update failed.");
        return;
      }
      await reload();
      if (newStatus === "delivered") {
        setToast("Delivered - gift records generated for recipients.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!cancelReason.trim()) return;
    setBusy(true);
    try {
      await advance("cancelled", cancelReason.trim());
      setShowCancel(false);
      setCancelReason("");
    } finally {
      setBusy(false);
    }
  }

  async function patchOrder(updates: OrderUpdate) {
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) await reload();
  }

  async function addRecipients(recipients: RecipientInput[]) {
    const res = await fetch(`/api/orders/${order.id}/recipients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipients }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message ?? "Failed to add recipients.");
    }
    await reload();
  }

  async function changeRecipientStatus(
    recipientId: string,
    status: RecipientDeliveryStatus,
  ) {
    await fetch(`/api/orders/${order.id}/recipients/${recipientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await reload();
  }

  async function removeRecipient(recipientId: string) {
    await fetch(`/api/orders/${order.id}/recipients/${recipientId}`, {
      method: "DELETE",
    });
    await reload();
  }

  function downloadPackingList() {
    interface PackRow {
      order_number: string;
      recipient: string;
      department: string;
      engraving: string;
      product_sku: string;
      product: string;
      quantity: number;
    }
    const rows: PackRow[] = order.recipients.flatMap((r) =>
      order.items.map((i) => ({
        order_number: order.order_number ?? "",
        recipient: r.recipient_name,
        department: r.recipient_department ?? "",
        engraving: r.personalisation_name,
        product_sku: i.product_sku,
        product: i.product_name,
        quantity: i.quantity,
      })),
    );
    const csv = Papa.unparse({
      fields: [
        "order_number",
        "recipient",
        "department",
        "engraving",
        "product_sku",
        "product",
        "quantity",
      ],
      data: rows as unknown as string[][],
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `packing-list-${order.order_number ?? order.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-navy">
            {order.order_number ?? "Draft Order"}
          </h1>
          <p className="text-sm text-[#6B7280]">{order.company_name ?? "-"}</p>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${meta.badge}`}
        >
          <span className={`size-2 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      {toast && (
        <div className="rounded-card border border-gold/30 bg-gold/10 px-4 py-2 text-sm text-navy">
          {toast}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column (60%) */}
        <div className="space-y-6 lg:col-span-3">
          {/* Pipeline + advance */}
          <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
            <OrderStatusPipeline status={order.status} />
            {nextStatuses.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {nextStatuses.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    onClick={() => advance(s)}
                    disabled={busy}
                  >
                    {ORDER_STATUS_META[s].label}
                    <ArrowRight className="ml-1 size-3.5" />
                  </Button>
                ))}
              </div>
            )}
          </section>

          {/* Line items */}
          <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
            <h2 className="font-heading mb-4 text-base font-semibold text-navy">
              Products
            </h2>
            <ul className="divide-y divide-border">
              {order.items.map((item) => {
                const product = getProductBySku(item.product_sku);
                return (
                  <li key={item.id} className="flex items-center gap-3 py-3">
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
                      {product?.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={item.product_name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-[#9CA3AF]">
                        {item.product_sku}
                        {item.collection_code
                          ? ` · Collection ${item.collection_code}`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-numbers text-navy">
                        {item.quantity} �-{" "}
                        {formatCurrency(Number(item.unit_price ?? 0))}
                      </p>
                      <p className="font-numbers text-xs text-[#6B7280]">
                        {formatCurrency(Number(item.line_total ?? 0))}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Recipients */}
          <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-base font-semibold text-navy">
                Recipients ({order.recipients.length})
              </h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddRecipients(true)}
              >
                <UserPlus className="mr-1.5 size-4" /> Add Recipients
              </Button>
            </div>
            <RecipientTable
              recipients={order.recipients}
              editable
              onStatusChange={changeRecipientStatus}
              onRemove={removeRecipient}
            />
          </section>

          {/* Status history */}
          <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
            <h2 className="font-heading mb-4 text-base font-semibold text-navy">
              Status History
            </h2>
            <StatusHistory entries={order.statusHistory} />
          </section>
        </div>

        {/* Right column (40%) */}
        <div className="space-y-6 lg:col-span-2">
          <OrderSummaryCard order={order} />
          <PaymentCard order={order} onSave={patchOrder} />
          <DeliveryCard order={order} onSave={patchOrder} />

          {/* Invoices */}
          <OrderInvoices
            orderId={order.id}
            razorpayConfigured={razorpayConfigured}
          />

          {/* Actions */}
          <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
            <h2 className="font-heading mb-4 text-base font-semibold text-navy">
              Actions
            </h2>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={downloadPackingList}
              >
                <PackageCheck className="mr-2 size-4" /> Download Packing List
              </Button>
              {order.status !== "cancelled" &&
                order.status !== "completed" && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600 hover:text-red-700"
                    onClick={() => setShowCancel(true)}
                  >
                    <Ban className="mr-2 size-4" /> Cancel Order
                  </Button>
                )}
            </div>
          </section>

          {/* Notes */}
          <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
            <h2 className="font-heading mb-3 text-base font-semibold text-navy">
              Notes
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium text-[#9CA3AF]">
                  Internal (admin only)
                </p>
                <p className="text-[#2D2D2D]">{order.internal_notes ?? "-"}</p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs font-medium text-[#9CA3AF]">
                  Client-visible
                </p>
                <p className="text-[#2D2D2D]">{order.client_notes ?? "-"}</p>
              </div>
              {order.special_instructions && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-medium text-[#9CA3AF]">
                    Special instructions
                  </p>
                  <p className="text-[#2D2D2D]">
                    {order.special_instructions}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <RecipientUpload
        orderId={order.id}
        open={showAddRecipients}
        onOpenChange={setShowAddRecipients}
        onAdd={addRecipients}
      />

      {/* Cancel dialog */}
      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              This sets the order to cancelled. A reason is required and logged
              in the status history.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            placeholder="Reason for cancellation"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancel(false)}
              disabled={busy}
            >
              Keep Order
            </Button>
            <Button
              variant="destructive"
              onClick={cancel}
              disabled={busy || !cancelReason.trim()}
            >
              {busy ? "Cancelling…" : "Cancel Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
