"use client";

import { AlertTriangle, CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CSVValidationResult } from "@/types/employee";

const COLUMNS = [
  "name",
  "email",
  "department",
  "designation",
  "date_of_birth",
  "joining_date",
  "tshirt_size",
] as const;

export function CSVPreview({ results }: { results: CSVValidationResult[] }) {
  const valid = results.filter((r) => r.isValid).length;
  const withErrors = results.filter((r) => !r.isValid).length;
  const withWarnings = results.filter(
    (r) => r.isValid && r.warnings.length > 0,
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-sm">
        <Badge tone="green" icon={<CircleCheck className="size-4" />}>
          {valid} valid
        </Badge>
        {withWarnings > 0 ? (
          <Badge tone="amber" icon={<AlertTriangle className="size-4" />}>
            {withWarnings} with warnings
          </Badge>
        ) : null}
        {withErrors > 0 ? (
          <Badge tone="red" icon={<CircleAlert className="size-4" />}>
            {withErrors} with errors
          </Badge>
        ) : null}
      </div>

      <div className="max-h-[50vh] overflow-auto rounded-lg border border-[#EDE9E3]">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-secondary text-xs uppercase text-[#6B7280]">
            <tr>
              <th className="px-3 py-2">#</th>
              {COLUMNS.map((c) => (
                <th key={c} className="px-3 py-2 whitespace-nowrap">
                  {c.replace(/_/g, " ")}
                </th>
              ))}
              <th className="px-3 py-2">Issues</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const tone = !r.isValid
                ? "bg-destructive/5"
                : r.warnings.length > 0
                  ? "bg-amber-50"
                  : "bg-white";
              return (
                <tr
                  key={r.row}
                  className={cn("border-t border-[#EDE9E3]", tone)}
                >
                  <td className="px-3 py-2 text-[#9CA3AF]">{r.row}</td>
                  {COLUMNS.map((c) => (
                    <td key={c} className="px-3 py-2 whitespace-nowrap">
                      {r.data[c] || (
                        <span className="text-[#D1D5DB]">—</span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    {r.errors.map((e) => (
                      <span
                        key={e}
                        className="mr-1 inline-block rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] text-destructive"
                      >
                        {e}
                      </span>
                    ))}
                    {r.warnings.map((w) => (
                      <span
                        key={w}
                        className="mr-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-700"
                      >
                        {w}
                      </span>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Badge({
  tone,
  icon,
  children,
}: {
  tone: "green" | "amber" | "red";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const tones = {
    green: "bg-[#2D6A4F]/10 text-[#2D6A4F]",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-destructive/10 text-destructive",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium",
        tones[tone],
      )}
    >
      {icon}
      {children}
    </span>
  );
}
