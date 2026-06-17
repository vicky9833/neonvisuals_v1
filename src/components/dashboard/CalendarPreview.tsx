import Link from "next/link";
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isToday,
  parseISO,
  startOfMonth,
} from "date-fns";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OccasionItem } from "@/lib/dashboard/queries";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function CalendarPreview({
  occasions,
  month,
  year,
}: {
  occasions: OccasionItem[];
  month: number;
  year: number;
}) {
  const first = startOfMonth(new Date(year, month, 1));
  const days = eachDayOfInterval({ start: first, end: endOfMonth(first) });
  const leading = getDay(first); // 0 (Sun) .. 6 (Sat)

  // Map "yyyy-MM-dd" → occasion titles for the dotted days.
  const byDay = new Map<string, string[]>();
  for (const o of occasions) {
    const key = format(parseISO(o.date), "yyyy-MM-dd");
    const label = o.title ?? o.occasion_type.replace(/_/g, " ");
    byDay.set(key, [...(byDay.get(key) ?? []), label]);
  }

  return (
    <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold text-navy">
          Your Gifting Calendar
        </h2>
        <Link
          href="/dashboard/occasions"
          className="inline-flex items-center gap-1 text-sm font-medium text-gold hover:underline"
        >
          View Full Calendar <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <p className="mt-1 text-sm text-[#6B7280]">{format(first, "MMMM yyyy")}</p>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d, i) => (
          <span
            key={`${d}-${i}`}
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
          const events = byDay.get(key);
          const hasEvents = Boolean(events?.length);
          return (
            <div
              key={key}
              title={hasEvents ? events!.join(", ") : undefined}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-md text-sm",
                isToday(day)
                  ? "bg-navy font-semibold text-white"
                  : "text-[#333333] hover:bg-secondary",
              )}
            >
              {format(day, "d")}
              {hasEvents ? (
                <span
                  className={cn(
                    "absolute bottom-1 size-1.5 rounded-full",
                    isToday(day) ? "bg-gold" : "bg-gold",
                  )}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {occasions.length === 0 ? (
        <p className="mt-4 text-center text-xs text-[#9CA3AF]">
          Add your team&apos;s occasions to see them here.
        </p>
      ) : null}
    </section>
  );
}
