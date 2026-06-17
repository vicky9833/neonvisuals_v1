"use client";

import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isToday,
  startOfMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/occasion";
import { EventPopover } from "@/components/occasions/EventPopover";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarMonth({
  month,
  year,
  events,
  loading,
  onPrev,
  onNext,
}: {
  month: number;
  year: number;
  events: CalendarEvent[];
  loading?: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const first = startOfMonth(new Date(year, month, 1));
  const days = eachDayOfInterval({ start: first, end: endOfMonth(first) });
  const leading = (getDay(first) + 6) % 7; // Monday-first

  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  }

  return (
    <div className="rounded-xl border border-[#EDE9E3] bg-white p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-navy">
          {format(first, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrev}
            className="rounded-md p-1.5 text-[#6B7280] hover:bg-secondary"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-md p-1.5 text-[#6B7280] hover:bg-secondary"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "grid grid-cols-7 gap-1 text-center",
          loading && "opacity-50",
        )}
      >
        {WEEKDAYS.map((d) => (
          <span
            key={d}
            className="py-1 text-xs font-semibold uppercase text-[#9CA3AF]"
          >
            {d}
          </span>
        ))}
        {Array.from({ length: leading }).map((_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = byDay.get(key) ?? [];
          const cell = (
            <div
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-md text-sm",
                isToday(day)
                  ? "bg-navy font-semibold text-white"
                  : "text-[#333333]",
                dayEvents.length > 0 && "cursor-pointer hover:bg-secondary",
              )}
            >
              {format(day, "d")}
              {dayEvents.length > 0 ? (
                <span className="absolute bottom-1 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <span
                      key={e.id}
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: e.color }}
                    />
                  ))}
                </span>
              ) : null}
            </div>
          );

          if (dayEvents.length === 0) {
            return <div key={key}>{cell}</div>;
          }
          return (
            <Popover key={key}>
              <PopoverTrigger asChild>{cell}</PopoverTrigger>
              <PopoverContent align="center" className="w-auto">
                <EventPopover date={key} events={dayEvents} />
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
}
