import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_FLOW } from "@/lib/engines/order-constants";
import type { OrderStatus } from "@/lib/engines/order";
import { ORDER_STATUS_META } from "./order-status";

interface OrderStatusPipelineProps {
  status: OrderStatus;
}

/**
 * Horizontal stepper visualising the order lifecycle. Cancelled orders render
 * a dedicated red banner instead of the pipeline.
 */
export function OrderStatusPipeline({ status }: OrderStatusPipelineProps) {
  if (status === "cancelled") {
    return (
      <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        This order was cancelled.
      </div>
    );
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(status);

  return (
    <ol className="flex flex-wrap items-center gap-y-3">
      {ORDER_STATUS_FLOW.map((step, idx) => {
        const meta = ORDER_STATUS_META[step];
        const done = idx < currentIndex;
        const current = idx === currentIndex;
        return (
          <li key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  done && "border-gold bg-gold text-white",
                  current && "border-navy bg-navy text-white",
                  !done && !current && "border-border bg-white text-[#9CA3AF]",
                )}
              >
                {done ? <Check className="size-4" /> : idx + 1}
              </span>
              <span
                className={cn(
                  "max-w-[64px] text-center text-[11px] leading-tight",
                  current ? "font-semibold text-navy" : "text-[#6B7280]",
                )}
              >
                {meta.short}
              </span>
            </div>
            {idx < ORDER_STATUS_FLOW.length - 1 && (
              <span
                className={cn(
                  "mx-1 h-0.5 w-6 sm:w-10",
                  idx < currentIndex ? "bg-gold" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
