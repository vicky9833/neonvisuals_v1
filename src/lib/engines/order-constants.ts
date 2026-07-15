/**
 * Pure order lifecycle constants — CLIENT-SAFE (no server imports).
 *
 * These runtime values are imported by client components (OrderStatusPipeline,
 * OrderDetail). They live here, separate from the server-only `order.ts` engine
 * (which imports the request-scoped Supabase client), so importing them never
 * pulls `next/headers` into the client bundle. `order.ts` re-exports them for
 * server callers.
 */
import type { OrderStatus } from "./order";

/** Valid forward transitions. Any status may move to "cancelled". */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["in_production", "cancelled"],
  in_production: ["quality_check", "cancelled"],
  quality_check: ["packed", "in_production", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  return (ORDER_TRANSITIONS[from] ?? []).includes(to);
}

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "draft",
  "confirmed",
  "in_production",
  "quality_check",
  "packed",
  "shipped",
  "delivered",
  "completed",
];
