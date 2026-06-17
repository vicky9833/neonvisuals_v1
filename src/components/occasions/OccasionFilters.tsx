"use client";

import { cn } from "@/lib/utils";
import type { CalendarEventType } from "@/types/occasion";

export type OccasionFilter = "all" | CalendarEventType;

const FILTERS: { value: OccasionFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "birthday", label: "Birthdays" },
  { value: "work_anniversary", label: "Anniversaries" },
  { value: "festival", label: "Festivals" },
  { value: "custom", label: "Custom" },
];

export function OccasionFilters({
  value,
  onChange,
}: {
  value: OccasionFilter;
  onChange: (value: OccasionFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          type="button"
          onClick={() => onChange(f.value)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            value === f.value
              ? "border-navy bg-navy text-white"
              : "border-[#EDE9E3] text-[#6B7280] hover:border-navy/40",
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
