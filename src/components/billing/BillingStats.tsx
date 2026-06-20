import type { BillingStats as BillingStatsData } from "@/lib/engines/billing";
import { compactRs } from "./billing-meta";

function Tile({
  value,
  label,
  accent,
  warn,
}: {
  value: string;
  label: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#EDE9E3] bg-white p-4 shadow-sm">
      <p
        className={`font-numbers text-2xl font-bold ${
          warn ? "text-red-600" : accent ? "text-gold" : "text-navy"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-[#6B7280]">{label}</p>
    </div>
  );
}

export function BillingStats({ stats }: { stats: BillingStatsData }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Tile value={compactRs(stats.totalInvoiced)} label="Invoiced" />
      <Tile value={compactRs(stats.totalCollected)} label="Collected" accent />
      <Tile value={compactRs(stats.totalOutstanding)} label="Outstanding" />
      <Tile
        value={stats.overdueCount.toLocaleString("en-IN")}
        label="Overdue"
        warn={stats.overdueCount > 0}
      />
      <Tile value={`${stats.collectionRate}%`} label="Collection Rate" />
    </div>
  );
}
