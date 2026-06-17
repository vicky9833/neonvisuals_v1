import { format, parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";
import type { CalendarEvent } from "@/types/occasion";
import { EventCard } from "@/components/occasions/EventCard";

export function CalendarList({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-[#EDE9E3] bg-white px-6 py-16 text-center">
        <CalendarDays className="size-8 text-[#9CA3AF]" />
        <p className="mt-3 text-sm font-medium text-navy">
          No upcoming occasions
        </p>
        <p className="mt-1 max-w-sm text-xs text-[#6B7280]">
          Add team members or custom events, and turn on the festivals you
          observe to fill your gifting calendar.
        </p>
      </div>
    );
  }

  // Group by month label.
  const groups = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const label = format(parseISO(e.date), "MMMM yyyy");
    groups.set(label, [...(groups.get(label) ?? []), e]);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([label, items]) => (
        <section key={label}>
          <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-[#9CA3AF]">
            {label}
          </h3>
          <div className="mt-2 rounded-xl border border-[#EDE9E3] bg-white px-4">
            {items.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
