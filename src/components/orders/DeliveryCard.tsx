"use client";

import { useState } from "react";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils/format";
import type { Order, OrderUpdate } from "@/lib/engines/order";

interface DeliveryCardProps {
  order: Order;
  onSave: (updates: OrderUpdate) => Promise<void>;
}

/** Delivery info + editable tracking/courier (admin). */
export function DeliveryCard({ order, onSave }: DeliveryCardProps) {
  const [editing, setEditing] = useState(false);
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [courier, setCourier] = useState(order.courier_partner ?? "");
  const [expected, setExpected] = useState(
    order.expected_delivery_date ?? "",
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await onSave({
        trackingNumber: tracking.trim() || null,
        courierPartner: courier.trim() || null,
        expectedDeliveryDate: expected || null,
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
          <Truck className="size-4 text-gold" /> Delivery
        </h2>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-gold hover:underline"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="expected">Expected delivery</Label>
            <Input
              id="expected"
              type="date"
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tracking">Tracking number</Label>
            <Input
              id="tracking"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="e.g. BLR123456789"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="courier">Courier partner</Label>
            <Input
              id="courier"
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
              placeholder="e.g. Delhivery"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save"}
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
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-[#6B7280]">Expected</dt>
            <dd className="text-navy">
              {order.expected_delivery_date
                ? formatDate(order.expected_delivery_date)
                : "—"}
            </dd>
          </div>
          {order.actual_delivery_date && (
            <div className="flex justify-between">
              <dt className="text-[#6B7280]">Delivered</dt>
              <dd className="text-navy">
                {formatDate(order.actual_delivery_date)}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-[#6B7280]">Tracking</dt>
            <dd className="text-navy">{order.tracking_number ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#6B7280]">Courier</dt>
            <dd className="text-navy">{order.courier_partner ?? "—"}</dd>
          </div>
          <div className="border-t border-border pt-2">
            <dt className="text-[#6B7280]">Address</dt>
            <dd className="mt-1 text-navy">
              {order.delivery_address ?? "—"}
              {order.delivery_city ? `, ${order.delivery_city}` : ""}
              {order.delivery_pincode ? ` — ${order.delivery_pincode}` : ""}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
