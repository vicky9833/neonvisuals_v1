"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "./ChartCard";

interface SeriesDef {
  key: string;
  name: string;
  color: string;
}

interface LineChartCardProps {
  title: string;
  subtitle?: string;
  data: Record<string, unknown>[];
  xKey: string;
  series: SeriesDef[];
  currency?: boolean;
  exportName?: string;
}

function compact(n: number, currency: boolean): string {
  const prefix = currency ? "₹" : "";
  if (Math.abs(n) >= 100000) return `${prefix}${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `${prefix}${(n / 1000).toFixed(0)}K`;
  return `${prefix}${n}`;
}

export function LineChartCard({
  title,
  subtitle,
  data,
  xKey,
  series,
  currency = false,
  exportName,
}: LineChartCardProps) {
  const hasData = data.some((row) => series.some((s) => Number(row[s.key] ?? 0) !== 0));
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      exportRows={hasData ? data : []}
      exportName={exportName ?? title}
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EDE9E3" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#EDE9E3" }} />
          <YAxis
            tick={{ fontSize: 11, fill: "#6B7280" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => compact(Number(v), currency)}
            width={48}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1A1A2E",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 12,
            }}
            formatter={(value, name) => [compact(Number(value), currency), name]}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <Legend series={series} />
    </ChartCard>
  );
}

function Legend({ series }: { series: SeriesDef[] }) {
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-4">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-[#6B7280]">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
          {s.name}
        </span>
      ))}
    </div>
  );
}
