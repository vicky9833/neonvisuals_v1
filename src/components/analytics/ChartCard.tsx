"use client";

import type { ReactNode } from "react";
import { ExportButton } from "./ExportButton";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  exportRows?: Record<string, unknown>[];
  exportName?: string;
  children: ReactNode;
}

export const CHART_COLORS = {
  gold: "#C4A35A",
  navy: "#1A1A2E",
  green: "#10B981",
  red: "#EF4444",
  slate: "#94A3B8",
};

/** 11-colour palette for collection/category breakdowns. */
export const PALETTE = [
  "#C4A35A",
  "#1A1A2E",
  "#10B981",
  "#7C2D36",
  "#2D6A4F",
  "#6366F1",
  "#0EA5E9",
  "#F59E0B",
  "#EC4899",
  "#14B8A6",
  "#94A3B8",
];

export function ChartCard({
  title,
  subtitle,
  exportRows,
  exportName,
  children,
}: ChartCardProps) {
  const isEmpty = exportRows && exportRows.length === 0;
  return (
    <section className="rounded-xl border border-[#EDE9E3] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-base font-semibold text-navy">{title}</h3>
          {subtitle && <p className="text-xs text-[#9CA3AF]">{subtitle}</p>}
        </div>
        {exportRows && (
          <ExportButton filename={exportName ?? title} rows={exportRows} />
        )}
      </div>
      {isEmpty ? (
        <div className="flex h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
          <p className="text-sm font-medium text-[#6B7280]">No data for this period</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">
            Adjust the date range or wait for activity to appear.
          </p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
