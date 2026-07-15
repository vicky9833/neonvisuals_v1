"use client";

import { Fragment, useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmployeeAvatar } from "@/components/employees/EmployeeAvatar";
import { DeskTestTracker } from "@/components/gifts/DeskTestTracker";
import { REACTION_LABELS, type GiftRecord } from "@/types/gift";

const DESK_BADGE: Record<string, { icon: string; label: string; cls: string }> = {
  on_desk: { icon: "🟢", label: "On Desk", cls: "bg-[#2D6A4F]/10 text-[#2D6A4F]" },
  kept_elsewhere: { icon: "📦", label: "Elsewhere", cls: "bg-blue-50 text-blue-600" },
  not_kept: { icon: "❌", label: "Not Kept", cls: "bg-destructive/10 text-destructive" },
  unknown: { icon: "❓", label: "Unknown", cls: "bg-[#9CA3AF]/15 text-[#6B7280]" },
};

export function GiftHistoryTable({
  records,
  onChanged,
}: {
  records: GiftRecord[];
  onChanged?: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  function toggle(id: string) {
    setExpanded((cur) => (cur === id ? null : id));
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#EDE9E3] bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-[#EDE9E3] bg-secondary/50 text-xs uppercase text-[#6B7280]">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Employee</th>
            <th className="px-4 py-3">Product</th>
            <th className="hidden px-4 py-3 sm:table-cell">Occasion</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const desk = DESK_BADGE[r.desk_test_status] ?? DESK_BADGE.unknown;
            const isOpen = expanded === r.id;
            return (
              <Fragment key={r.id}>
                <tr
                  className="cursor-pointer border-b border-[#EDE9E3] hover:bg-secondary/30"
                  onClick={() => toggle(r.id)}
                >
                  <td className="px-4 py-3 text-[#6B7280]">
                    {format(parseISO(r.gifted_date), "MMM yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <EmployeeAvatar name={r.employee_name ?? "?"} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium text-navy">
                          {r.employee_name ?? "-"}
                        </p>
                        <p className="text-xs text-[#9CA3AF]">
                          {r.employee_department ?? ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-navy">{r.product_name}</p>
                    <p className="text-xs text-[#9CA3AF]">{r.product_sku}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-[#6B7280] sm:table-cell">
                    {r.occasion_label ?? r.occasion_type}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        desk.cls,
                      )}
                    >
                      {desk.icon} {desk.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronDown
                      className={cn(
                        "inline size-4 text-[#9CA3AF] transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </td>
                </tr>
                {isOpen ? (
                  <tr className="bg-secondary/20">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1 text-xs text-[#6B7280]">
                          <p>
                            <span className="font-medium text-navy">Packaging:</span>{" "}
                            {r.packaging_tier ?? "-"}
                          </p>
                          <p>
                            <span className="font-medium text-navy">
                              Personalisation:
                            </span>{" "}
                            {r.personalisation_level?.replace(/_/g, " ") ?? "-"}
                          </p>
                          <p>
                            <span className="font-medium text-navy">Delivery:</span>{" "}
                            {r.delivery_status.replace(/_/g, " ")}
                          </p>
                          {r.recipient_reaction &&
                          r.recipient_reaction !== "unknown" ? (
                            <p>
                              <span className="font-medium text-navy">Reaction:</span>{" "}
                              {REACTION_LABELS[r.recipient_reaction]}
                            </p>
                          ) : null}
                          {r.narrative_message ? (
                            <p className="italic">
                              &ldquo;{r.narrative_message}&rdquo;
                            </p>
                          ) : null}
                        </div>
                        <DeskTestTracker gift={r} onUpdated={onChanged} />
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
