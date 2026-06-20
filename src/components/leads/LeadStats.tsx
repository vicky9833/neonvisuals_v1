import type { LeadStats as LeadStatsData } from "@/lib/engines/lead";

function compactRs(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
}

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

export function LeadStats({ stats }: { stats: LeadStatsData }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Tile value={stats.total.toLocaleString("en-IN")} label="Total Leads" />
      <Tile value={compactRs(stats.pipelineValue)} label="Pipeline Value" accent />
      <Tile value={`${stats.conversionRate}%`} label="Conversion Rate" />
      <Tile value={`${stats.avgDaysToConvert}d`} label="Avg to Close" />
      <Tile
        value={stats.overdueFollowUps.toLocaleString("en-IN")}
        label="Overdue Follow-ups"
        warn={stats.overdueFollowUps > 0}
      />
      <Tile
        value={stats.thisWeekFollowUps.toLocaleString("en-IN")}
        label="This Week Follow-ups"
      />
    </div>
  );
}
