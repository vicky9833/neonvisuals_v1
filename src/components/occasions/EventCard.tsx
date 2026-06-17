import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowRight } from "lucide-react";
import type { CalendarEvent } from "@/types/occasion";

export function EventCard({ event }: { event: CalendarEvent }) {
  return (
    <div className="flex gap-3 border-b border-[#EDE9E3] py-4 last:border-0">
      <div className="flex w-12 shrink-0 flex-col items-center">
        <span
          className="mb-1 size-2.5 rounded-full"
          style={{ backgroundColor: event.color }}
        />
        <span className="font-numbers text-sm font-bold text-navy">
          {format(parseISO(event.date), "dd")}
        </span>
        <span className="text-[10px] uppercase text-[#9CA3AF]">
          {format(parseISO(event.date), "MMM")}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-navy">{event.title}</p>
        <p className="text-xs text-[#6B7280]">
          {[
            event.employeeDepartment,
            event.originalDate && event.type !== "festival"
              ? `Since ${format(parseISO(event.originalDate), "MMM yyyy")}`
              : null,
            event.type === "festival" ? "Festival" : null,
            event.description && event.type === "custom"
              ? event.description
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {event.suggestedProduct ? (
          <p className="mt-0.5 text-xs text-[#9CA3AF]">
            Suggested: {event.suggestedProduct}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link
            href={event.actionUrl ?? "/gift-builder"}
            className="inline-flex items-center gap-1 text-sm font-semibold text-gold hover:underline"
          >
            {event.suggestedAction ?? "Plan a Gift"}{" "}
            <ArrowRight className="size-3.5" />
          </Link>
          {event.employeeId ? (
            <Link
              href={`/dashboard/employees/${event.employeeId}`}
              className="text-sm font-medium text-[#6B7280] hover:text-navy"
            >
              View Profile →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
