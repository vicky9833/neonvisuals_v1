"use client";

import { ChartCard } from "./ChartCard";

interface FunnelStage {
  stage: string;
  count: number;
  value: number;
  conversionFromPrevious: number;
}

function compactRs(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

/** CSS-based funnel - each stage bar width scales to the top stage. */
export function FunnelChart({
  data,
  exportName = "sales-funnel",
}: {
  data: FunnelStage[];
  exportName?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const hasData = data.some((d) => d.count > 0);

  return (
    <ChartCard
      title="Sales Funnel"
      subtitle="Lead progression through pipeline stages"
      exportRows={hasData ? (data as unknown as Record<string, unknown>[]) : []}
      exportName={exportName}
    >
      <div className="space-y-2 py-2">
        {data.map((stage, i) => {
          const widthPct = Math.max(8, (stage.count / max) * 100);
          return (
            <div key={stage.stage} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm text-[#6B7280]">{stage.stage}</span>
              <div className="flex-1">
                <div
                  className="flex h-10 items-center justify-between rounded-lg px-3 text-white"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: "#1A1A2E",
                    opacity: 1 - i * 0.1,
                  }}
                >
                  <span className="font-numbers text-sm font-semibold">{stage.count}</span>
                  <span className="font-numbers text-xs opacity-80">{compactRs(stage.value)}</span>
                </div>
              </div>
              <span className="w-12 shrink-0 text-right text-xs text-[#9CA3AF]">
                {i === 0 ? "-" : `${stage.conversionFromPrevious}%`}
              </span>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
