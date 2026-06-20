"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClientOrder } from "@/lib/engines/order";
import { ClientOrderCard } from "./ClientOrderCard";

interface ClientOrderListProps {
  initialOrders: ClientOrder[];
}

/** Client dashboard order list — read-only, no pricing. */
export function ClientOrderList({ initialOrders }: ClientOrderListProps) {
  const [orders, setOrders] = useState<ClientOrder[]>(initialOrders);
  const [loading, setLoading] = useState(initialOrders.length === 0);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.data?.orders) setOrders(body.data.orders as ClientOrder[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<Package className="size-10" />}
        title="No orders yet"
        description="Once you accept a quote, your gifting orders will appear here with live production and delivery status."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {orders.map((o) => (
        <ClientOrderCard key={o.id} order={o} />
      ))}
    </div>
  );
}
