"use client";

import { ArrowUpDown, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { Lead } from "@/lib/engines/lead";
import { SOURCE_LABEL } from "./lead-meta";
import { LeadStatusBadge, PriorityDot } from "./LeadStatusBadge";
import { LeadScoreIndicator } from "./LeadScoreIndicator";

type SortColumn =
  | "created_at"
  | "lead_score"
  | "next_follow_up_date"
  | "estimated_order_value";

interface LeadListProps {
  leads: Lead[];
  loading?: boolean;
  onSelect: (id: string) => void;
  sortBy: SortColumn;
  onSort: (column: SortColumn) => void;
}

function isOverdue(date: string | null): boolean {
  if (!date) return false;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

function SortHead({
  label,
  column,
  active,
  onSort,
  className,
}: {
  label: string;
  column: SortColumn;
  active: boolean;
  onSort: (c: SortColumn) => void;
  className?: string;
}) {
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 ${active ? "text-navy" : ""}`}
      >
        {label}
        <ArrowUpDown className="size-3" />
      </button>
    </TableHead>
  );
}

export function LeadList({
  leads,
  loading,
  onSelect,
  sortBy,
  onSort,
}: LeadListProps) {
  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead className="hidden md:table-cell">Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Source</TableHead>
            <SortHead
              label="Value"
              column="estimated_order_value"
              active={sortBy === "estimated_order_value"}
              onSort={onSort}
              className="text-right"
            />
            <SortHead
              label="Score"
              column="lead_score"
              active={sortBy === "lead_score"}
              onSort={onSort}
            />
            <SortHead
              label="Follow-up"
              column="next_follow_up_date"
              active={sortBy === "next_follow_up_date"}
              onSort={onSort}
              className="hidden sm:table-cell"
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-24 text-center text-muted-foreground"
              >
                {loading ? "Loading…" : "No leads found."}
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => {
              const overdue = isOverdue(lead.next_follow_up_date);
              return (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer"
                  onClick={() => onSelect(lead.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <PriorityDot priority={lead.priority} />
                      <span className="font-medium text-navy">
                        {lead.company_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-[#6B7280]">
                    {lead.contact_name}
                  </TableCell>
                  <TableCell>
                    <LeadStatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-[#6B7280]">
                    {SOURCE_LABEL[lead.source]}
                  </TableCell>
                  <TableCell className="font-numbers text-right text-sm text-navy">
                    {lead.estimated_order_value
                      ? formatCurrency(Number(lead.estimated_order_value))
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <LeadScoreIndicator score={lead.lead_score} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">
                    {lead.next_follow_up_date ? (
                      <span
                        className={`inline-flex items-center gap-1 ${
                          overdue ? "font-medium text-red-600" : "text-[#6B7280]"
                        }`}
                      >
                        {formatDate(lead.next_follow_up_date)}
                        {overdue && <AlertTriangle className="size-3" />}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
