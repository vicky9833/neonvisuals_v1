import { AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { Lead } from "@/lib/engines/lead";
import { PRIORITY_META, SOURCE_LABEL } from "./lead-meta";
import { PriorityDot } from "./LeadStatusBadge";
import { LeadScoreIndicator } from "./LeadScoreIndicator";

interface LeadCardProps {
  lead: Lead;
  onClick?: () => void;
}

function isOverdue(date: string | null): boolean {
  if (!date) return false;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

/** Compact Kanban card for the pipeline board. */
export function LeadCard({ lead, onClick }: LeadCardProps) {
  const overdue = isOverdue(lead.next_follow_up_date);
  const priority = PRIORITY_META[lead.priority];

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-[#EDE9E3] bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-2">
        <PriorityDot priority={lead.priority} />
        <span className="truncate text-sm font-semibold text-navy">
          {lead.company_name}
        </span>
      </div>
      <p className="mt-0.5 truncate text-xs text-[#6B7280]">
        {lead.contact_name}
        {lead.contact_designation ? ` · ${lead.contact_designation}` : ""}
      </p>

      {(lead.estimated_order_value || lead.estimated_kit_count) && (
        <p className="font-numbers mt-1.5 text-xs text-[#2D2D2D]">
          {lead.estimated_order_value
            ? formatCurrency(Number(lead.estimated_order_value))
            : "-"}
          {lead.estimated_kit_count
            ? ` · ${lead.estimated_kit_count} kits`
            : ""}
        </p>
      )}

      <p className="mt-1 text-[11px] text-[#9CA3AF]">
        Source: {SOURCE_LABEL[lead.source]}
      </p>

      {lead.next_follow_up_date && (
        <p
          className={`mt-1 inline-flex items-center gap-1 text-[11px] ${
            overdue ? "font-medium text-red-600" : "text-[#9CA3AF]"
          }`}
        >
          Follow-up: {formatDate(lead.next_follow_up_date)}
          {overdue && <AlertTriangle className="size-3" />}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between">
        <LeadScoreIndicator score={lead.lead_score} />
        <span className={`text-[10px] font-medium uppercase ${priority.text}`}>
          {priority.label}
        </span>
      </div>
    </button>
  );
}
