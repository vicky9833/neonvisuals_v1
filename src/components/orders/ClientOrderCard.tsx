import Link from "next/link";
import { ArrowRight, Truck } from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import type { ClientOrder, OrderStatus } from "@/lib/engines/order";
import { ORDER_STATUS_META } from "./order-status";

const PACKAGING_LABEL: Record<string, string> = {
  essential: "Essential",
  standard: "Standard",
  premium: "Premium",
  flagship: "Flagship",
};

interface ClientOrderCardProps {
  order: ClientOrder;
}

/** Friendly, price-free order card for the client dashboard. */
export function ClientOrderCard({ order }: ClientOrderCardProps) {
  const meta = ORDER_STATUS_META[order.status as OrderStatus];
  const productNames = order.items.map((i) => i.product_name).join(", ");
  const isShipped = order.status === "shipped" || order.status === "delivered";

  return (
    <article className="flex flex-col rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-numbers font-semibold text-navy">
            {order.order_number ?? "Order"}
          </p>
          <p className="text-sm text-[#6B7280]">
            {order.occasion_label ?? order.occasion_type ?? "Gifting order"} ·{" "}
            {order.kit_count} kit{order.kit_count === 1 ? "" : "s"}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}
        >
          <span className={`size-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      <dl className="mt-4 space-y-1.5 text-sm">
        {order.expected_delivery_date && (
          <div className="flex justify-between">
            <dt className="text-[#9CA3AF]">Expected delivery</dt>
            <dd className="text-navy">
              {formatDate(order.expected_delivery_date)}
            </dd>
          </div>
        )}
        {productNames && (
          <div>
            <dt className="text-[#9CA3AF]">Products</dt>
            <dd className="mt-0.5 text-[#2D2D2D]">{productNames}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-[#9CA3AF]">Packaging</dt>
          <dd className="text-navy">
            {PACKAGING_LABEL[order.packaging_tier] ?? order.packaging_tier}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex items-center gap-4 border-t border-border pt-4">
        <Link
          href={`/dashboard/orders/${order.id}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-gold hover:underline"
        >
          View Details <ArrowRight className="size-3.5" />
        </Link>
        {isShipped && order.tracking_number && (
          <span className="inline-flex items-center gap-1 text-sm text-[#6B7280]">
            <Truck className="size-3.5" /> {order.tracking_number}
          </span>
        )}
      </div>
    </article>
  );
}
