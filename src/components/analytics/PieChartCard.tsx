"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ChartCard, PALETTE } from "./ChartCard";

interface PieChartCardProps {
  title: string;
  subtitle?: string;
  data: Record<string, unknown>[];
  nameKey: string;
  valueKey: string;
  exportName?: string;
  donut?: boolean;
}

export function PieChartCard({
  title,
  subtitle,
  data,
  nameKey,
  valueKey,
  exportName,
  donut = true,
}: PieChartCardProps) {
  const hasData = data.some((row) => Number(row[valueKey] ?? 0) > 0);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      exportRows={hasData ? data : []}
      exportName={exportName ?? title}
    >
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={donut ? 60 : 0}
            outerRadius={100}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1A1A2E",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {data.map((row, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-xs text-[#6B7280]">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
            {String(row[nameKey])} ({String(row[valueKey])})
          </span>
        ))}
      </div>
    </ChartCard>
  );
}
