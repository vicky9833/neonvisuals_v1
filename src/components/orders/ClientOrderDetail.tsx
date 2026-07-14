import Image from "next/image";
import { Truck } from "lucide-react";
import { formatDate, formatDateFull } from "@/lib/utils/format";
import { getProductBySku } from "@/lib/catalog";
import type { ClientOrder, OrderStatus } from "@/lib/engines/order";
import { ORDER_STATUS_META, RECIPIENT_STATUS_META } from "./order-status";
import { OrderStatusPipeline } from "./OrderStatusPipeline";
import { ClientOrderInvoices } from "@/components/billing/ClientOrderInvoices";

interface ClientOrderDetailProps {
  order: ClientOrder;
}

/**
 * Client-facing order detail. Shows products, recipients, status, and tracking
 * - NEVER any pricing or internal/payment information.
 */
export function ClientOrderDetail({ order }: ClientOrderDetailProps) {
  const meta = ORDER_STATUS_META[order.status as OrderStatus];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-navy">
            {order.order_number ?? "Order"}
          </h1>
          <p className="text-sm text-[#6B7280]">
            {order.occasion_label ?? order.occasion_type ?? "Gifting order"} ·{" "}
            {order.kit_count} kit{order.kit_count === 1 ? "" : "s"}
          </p>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${meta.badge}`}
        >
          <span className={`size-2 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
        <OrderStatusPipeline status={order.status} />
      </section>

      {/* Tracking */}
      {(order.tracking_number || order.expected_delivery_date) && (
        <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
          <h2 className="font-heading mb-3 flex items-center gap-2 text-base font-semibold text-navy">
            <Truck className="size-4 text-gold" /> Delivery
          </h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {order.expected_delivery_date && (
              <div className="flex justify-between sm:block">
                <dt className="text-[#9CA3AF]">Expected delivery</dt>
                <dd className="text-navy">
                  {formatDate(order.expected_delivery_date)}
                </dd>
              </div>
            )}
            {order.actual_delivery_date && (
              <div className="flex justify-between sm:block">
                <dt className="text-[#9CA3AF]">Delivered on</dt>
                <dd className="text-navy">
                  {formatDate(order.actual_delivery_date)}
                </dd>
              </div>
            )}
            {order.tracking_number && (
              <div className="flex justify-between sm:block">
                <dt className="text-[#9CA3AF]">Tracking number</dt>
                <dd className="font-numbers text-navy">
                  {order.tracking_number}
                </dd>
              </div>
            )}
            {order.courier_partner && (
              <div className="flex justify-between sm:block">
                <dt className="text-[#9CA3AF]">Courier</dt>
                <dd className="text-navy">{order.courier_partner}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* Products */}
      <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
        <h2 className="font-heading mb-4 text-base font-semibold text-navy">
          Products in this order
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {order.items.map((item) => {
            const product = getProductBySku(item.product_sku);
            return (
              <li
                key={item.product_sku}
                className="flex items-center gap-3 rounded-card border border-border p-3"
              >
                <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {product?.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={item.product_name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : null}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-navy">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-[#9CA3AF]">
                    Qty {item.quantity}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Recipients */}
      {order.recipients.length > 0 && (
        <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
          <h2 className="font-heading mb-4 text-base font-semibold text-navy">
            Recipients ({order.recipients.length})
          </h2>
          <ul className="divide-y divide-border">
            {order.recipients.map((r, idx) => (
              <li
                key={`${r.recipient_name}-${idx}`}
                className="flex items-center justify-between py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-navy">
                    {r.recipient_name}
                  </p>
                  {r.recipient_department && (
                    <p className="text-xs text-[#9CA3AF]">
                      {r.recipient_department}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${RECIPIENT_STATUS_META[r.delivery_status].badge}`}
                >
                  {RECIPIENT_STATUS_META[r.delivery_status].label}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Invoices */}
      <ClientOrderInvoices orderId={order.id} />

      {/* Timeline */}
      <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
        <h2 className="font-heading mb-4 text-base font-semibold text-navy">
          Order Timeline
        </h2>
        <ol className="space-y-3">
          {order.statusHistory.map((s, idx) => {
            const m =
              ORDER_STATUS_META[s.to_status as keyof typeof ORDER_STATUS_META];
            return (
              <li key={idx} className="flex gap-3">
                <span className={`mt-1.5 size-2 rounded-full ${m?.dot ?? "bg-gray-400"}`} />
                <div>
                  <p className="text-sm font-medium text-navy">
                    {m?.label ?? s.to_status}
                  </p>
                  <p className="text-xs text-[#9CA3AF]">
                    {formatDateFull(s.created_at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {order.client_notes && (
        <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
          <h2 className="font-heading mb-2 text-base font-semibold text-navy">
            A note from Neon Visuals
          </h2>
          <p className="text-sm text-[#2D2D2D]">{order.client_notes}</p>
        </section>
      )}
    </div>
  );
}
