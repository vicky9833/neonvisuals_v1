"use client";

import type { PipelineStage } from "@/lib/engines/lead";
import { STATUS_META } from "./lead-meta";
import { LeadCard } from "./LeadCard";

interface LeadPipelineProps {
  stages: PipelineStage[];
  onSelect: (id: string) => void;
}

function compactRs(n: number): string {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
}

/** Horizontal Kanban board. Click a card to open the detail drawer (where the
 * status can be changed — no drag-and-drop required). */
export function LeadPipeline({ stages, onSelect }: LeadPipelineProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const meta = STATUS_META[stage.status];
        return (
          <div
            key={stage.status}
            className={`flex w-64 shrink-0 flex-col rounded-xl border border-t-2 border-[#EDE9E3] bg-secondary/30 ${meta.column}`}
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-sm font-semibold text-navy">
                {stage.label}
              </span>
              <span className="font-numbers text-xs text-[#6B7280]">
                {stage.count}
                {stage.value > 0 ? ` · ${compactRs(stage.value)}` : ""}
              </span>
            </div>
            <div className="flex-1 space-y-2 px-2 pb-3">
              {stage.leads.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-[#9CA3AF]">
                  No leads
                </p>
              ) : (
                stage.leads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => onSelect(lead.id)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
