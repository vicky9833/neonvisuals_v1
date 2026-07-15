import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowRight } from "lucide-react";
import type { CalendarEvent } from "@/types/occasion";

/** List of events for a single date - rendered inside a calendar popover. */
export function EventPopover({
  date,
  events,
}: {
  date: string;
  events: CalendarEvent[];
}) {
  return (
    <div className="w-72 space-y-3">
      <p className="font-heading text-sm font-semibold text-navy">
        {format(parseISO(date), "EEEE, d MMM yyyy")}
      </p>
      <ul className="space-y-3">
        {events.map((e) => (
          <li key={e.id} className="flex gap-2.5">
            <span
              className="mt-1.5 size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: e.color }}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-navy">{e.title}</p>
              {e.employeeDepartment ? (
                <p className="text-xs text-[#6B7280]">{e.employeeDepartment}</p>
              ) : null}
              <Link
                href={e.actionUrl ?? "/gift-builder"}
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-gold hover:underline"
              >
                {e.suggestedAction ?? "Plan a Gift"}{" "}
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
