"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard, PALETTE } from "./ChartCard";

interface BarChartCardProps {
  title: string;
  subtitle?: string;
  data: Record<string, unknown>[];
  /** Category axis key. */
  labelKey: string;
  /** Value key. */
  valueKey: string;
  color?: string;
  /** Use the palette to colour each bar differently. */
  multicolor?: boolean;
  horizontal?: boolean;
  currency?: boolean;
  exportName?: string;
  height?: number;
}

function compact(n: number, currency: boolean): string {
  const prefix = currency ? "₹" : "";
  if (Math.abs(n) >= 100000) return `${prefix}${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `${prefix}${(n / 1000).toFixed(0)}K`;
  return `${prefix}${n}`;
}

export function BarChartCard({
  title,
  subtitle,
  data,
  labelKey,
  valueKey,
  color = "#C4A35A",
  multicolor = false,
  horizontal = false,
  currency = false,
  exportName,
  height = 300,
}: BarChartCardProps) {
  const hasData = data.some((row) => Number(row[valueKey] ?? 0) !== 0);
  const tooltipStyle = {
    backgroundColor: "#1A1A2E",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontSize: 12,
  };

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      exportRows={hasData ? data : []}
      exportName={exportName ?? title}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 16, left: horizontal ? 8 : 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#EDE9E3" horizontal={!horizontal} vertical={horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} tickFormatter={(v) => compact(Number(v), currency)} />
              <YAxis type="category" dataKey={labelKey} tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} width={130} />
            </>
          ) : (
            <>
              <XAxis dataKey={labelKey} tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#EDE9E3" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} tickFormatter={(v) => compact(Number(v), currency)} width={48} />
            </>
          )}
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(196,163,90,0.08)" }}
            formatter={(value) => compact(Number(value), currency)}
          />
          <Bar dataKey={valueKey} fill={color} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}>
            {multicolor &&
              data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
