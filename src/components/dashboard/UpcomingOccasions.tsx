import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowRight, CalendarPlus } from "lucide-react";
import type { OccasionItem } from "@/lib/dashboard/queries";

function prettyType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function UpcomingOccasions({
  occasions,
}: {
  occasions: OccasionItem[];
}) {
  return (
    <section className="rounded-xl border border-[#EDE9E3] bg-white p-6 shadow-sm">
      <h2 className="font-heading text-base font-semibold text-navy">
        Upcoming Occasions
      </h2>

      {occasions.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-lg bg-secondary/60 px-4 py-8 text-center">
          <CalendarPlus className="size-8 text-[#9CA3AF]" />
          <p className="mt-3 text-sm font-medium text-navy">
            No occasions set up yet
          </p>
          <p className="mt-1 text-xs text-[#6B7280]">
            Add your team&apos;s birthdays, work anniversaries, and important
            dates to never miss a gifting moment.
          </p>
          <Link
            href="/dashboard/occasions"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold hover:underline"
          >
            Set Up Now <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {occasions.map((o) => {
              const date = parseISO(o.date);
              return (
                <li key={o.id} className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary text-navy">
                    <span className="font-numbers text-sm font-bold leading-none">
                      {format(date, "dd")}
                    </span>
                    <span className="text-[10px] uppercase text-[#6B7280]">
                      {format(date, "MMM")}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy">
                      {o.title ?? prettyType(o.occasion_type)}
                    </p>
                    {o.employee_name ? (
                      <p className="truncate text-xs text-[#6B7280]">
                        {o.employee_name}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold">
                    {prettyType(o.occasion_type)}
                  </span>
                </li>
              );
            })}
          </ul>
          <Link
            href="/dashboard/occasions"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gold hover:underline"
          >
            View All <ArrowRight className="size-3.5" />
          </Link>
        </>
      )}
    </section>
  );
}
