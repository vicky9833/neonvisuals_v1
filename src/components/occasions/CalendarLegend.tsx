import { EVENT_COLORS } from "@/types/occasion";

const ITEMS: { label: string; color: string }[] = [
  { label: "Birthday", color: EVENT_COLORS.birthday },
  { label: "Work Anniversary", color: EVENT_COLORS.work_anniversary },
  { label: "Festival", color: EVENT_COLORS.festival },
  { label: "Custom Event", color: EVENT_COLORS.custom },
];

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280]">
      {ITEMS.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: i.color }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}
