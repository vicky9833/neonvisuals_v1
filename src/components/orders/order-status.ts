import type { OrderStatus, RecipientDeliveryStatus } from "@/lib/engines/order";

/** Short label + Tailwind badge classes per order status. */
export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; short: string; badge: string; dot: string }
> = {
  draft: {
    label: "Draft",
    short: "Draft",
    badge: "bg-gray-100 text-gray-700 border-gray-200",
    dot: "bg-gray-400",
  },
  confirmed: {
    label: "Confirmed",
    short: "Confirmed",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  in_production: {
    label: "In Production",
    short: "Production",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  quality_check: {
    label: "Quality Check",
    short: "QC",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
  },
  packed: {
    label: "Packed",
    short: "Packed",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500",
  },
  shipped: {
    label: "Shipped",
    short: "Shipped",
    badge: "bg-teal-50 text-teal-700 border-teal-200",
    dot: "bg-teal-500",
  },
  delivered: {
    label: "Delivered",
    short: "Delivered",
    badge: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
  completed: {
    label: "Completed",
    short: "Done",
    badge: "bg-green-100 text-green-800 border-green-300",
    dot: "bg-green-600",
  },
  cancelled: {
    label: "Cancelled",
    short: "Cancelled",
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
};

export const RECIPIENT_STATUS_META: Record<
  RecipientDeliveryStatus,
  { label: string; badge: string }
> = {
  pending: { label: "Pending", badge: "bg-gray-100 text-gray-700" },
  in_production: { label: "In Production", badge: "bg-amber-50 text-amber-700" },
  packed: { label: "Packed", badge: "bg-indigo-50 text-indigo-700" },
  shipped: { label: "Shipped", badge: "bg-teal-50 text-teal-700" },
  delivered: { label: "Delivered", badge: "bg-green-50 text-green-700" },
  returned: { label: "Returned", badge: "bg-red-50 text-red-700" },
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  advance_received: "Advance Received",
  partially_paid: "Partially Paid",
  fully_paid: "Fully Paid",
  refunded: "Refunded",
};
