import { formatCurrency } from "@/lib/utils/format";
import type { Order } from "@/lib/engines/order";

const PACKAGING_LABEL: Record<string, string> = {
  essential: "Essential",
  standard: "Standard",
  premium: "Premium",
  flagship: "Flagship",
};

const PERSONALISATION_LABEL: Record<string, string> = {
  name_only: "Name Only",
  name_occasion: "Name + Occasion",
  full_personal: "Full Personalisation",
};

interface OrderSummaryCardProps {
  order: Order;
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={strong ? "font-medium text-navy" : "text-[#6B7280]"}>
        {label}
      </span>
      <span
        className={
          strong
            ? "font-numbers font-semibold text-navy"
            : "font-numbers text-[#2D2D2D]"
        }
      >
        {value}
      </span>
    </div>
  );
}

/** Admin-only financial summary. Never rendered for clients. */
export function OrderSummaryCard({ order }: OrderSummaryCardProps) {
  const rs = (n: number | null) => formatCurrency(Number(n ?? 0));

  return (
    <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
      <h2 className="font-heading mb-4 text-base font-semibold text-navy">
        Order Summary
      </h2>

      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-[#9CA3AF]">Occasion</p>
          <p className="font-medium text-navy">
            {order.occasion_label ?? order.occasion_type ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#9CA3AF]">Kit Count</p>
          <p className="font-numbers font-medium text-navy">
            {order.kit_count.toLocaleString("en-IN")}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#9CA3AF]">Packaging</p>
          <p className="font-medium text-navy">
            {PACKAGING_LABEL[order.packaging_tier] ?? order.packaging_tier}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#9CA3AF]">Personalisation</p>
          <p className="font-medium text-navy">
            {PERSONALISATION_LABEL[order.personalisation_level] ??
              order.personalisation_level}
          </p>
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <Row label="Subtotal" value={rs(order.subtotal)} />
        <Row label="Packaging" value={rs(order.packaging_total)} />
        <Row label="Personalisation" value={rs(order.personalisation_total)} />
        {Number(order.rush_surcharge ?? 0) > 0 && (
          <Row label="Rush Surcharge" value={rs(order.rush_surcharge)} />
        )}
        {Number(order.discount_amount ?? 0) > 0 && (
          <Row
            label={`Discount (${order.discount_percent ?? 0}%)`}
            value={`− ${rs(order.discount_amount)}`}
          />
        )}
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <Row label="Grand Total" value={rs(order.grand_total)} strong />
        <p className="mt-1 text-xs text-[#9CA3AF]">
          Per kit investment:{" "}
          <span className="font-numbers">{rs(order.per_kit_investment)}</span>
        </p>
      </div>
    </section>
  );
}
