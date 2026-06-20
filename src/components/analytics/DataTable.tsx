"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartCard } from "./ChartCard";

export interface Column<T> {
  key: keyof T & string;
  label: string;
  numeric?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  title: string;
  subtitle?: string;
  columns: Column<T>[];
  rows: T[];
  exportName?: string;
  rowClassName?: (row: T) => string;
}

export function DataTable<T extends Record<string, unknown>>({
  title,
  subtitle,
  columns,
  rows,
  exportName,
  rowClassName,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return asc ? av - bv : bv - av;
      }
      return asc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [rows, sortKey, asc]);

  function toggleSort(key: string) {
    if (sortKey === key) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(false);
    }
  }

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      exportRows={rows as Record<string, unknown>[]}
      exportName={exportName ?? title}
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={c.numeric ? "text-right" : ""}>
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className="inline-flex items-center gap-1 hover:text-navy"
                  >
                    {c.label}
                    <ArrowUpDown className="size-3" />
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-20 text-center text-muted-foreground">
                  No data for this period.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((row, i) => (
                <TableRow key={i} className={rowClassName?.(row)}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.numeric ? "text-right font-numbers" : ""}>
                      {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </ChartCard>
  );
}
