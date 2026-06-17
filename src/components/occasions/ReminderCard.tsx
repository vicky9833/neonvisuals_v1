"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Reminder } from "@/types/occasion";

const COLORS: Record<Reminder["reminder_type"], string> = {
  birthday: "#3B82F6",
  work_anniversary: "#C4A35A",
  festival: "#10B981",
  custom_occasion: "#8B5CF6",
};

function relativeLabel(occasionDate: string): { text: string; overdue: boolean } {
  const occ = new Date(occasionDate);
  occ.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((occ.getTime() - now.getTime()) / 86_400_000);
  if (diff < 0)
    return {
      text: diff === -1 ? "yesterday" : `${Math.abs(diff)} days ago`,
      overdue: true,
    };
  if (diff === 0) return { text: "today", overdue: false };
  if (diff === 1) return { text: "tomorrow", overdue: false };
  return { text: `in ${diff} days`, overdue: false };
}

export function ReminderCard({
  reminder,
  onDismiss,
  onAction,
  compact,
}: {
  reminder: Reminder;
  onDismiss: (id: string) => void;
  onAction: (reminder: Reminder) => void;
  compact?: boolean;
}) {
  const { text, overdue } = relativeLabel(reminder.occasion_date);
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-3",
        overdue ? "border-amber-300 bg-amber-50" : "border-[#EDE9E3] bg-white",
      )}
    >
      <span
        className="mt-1 size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: COLORS[reminder.reminder_type] }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-navy">
          {overdue ? (
            <span className="font-semibold text-amber-700">OVERDUE: </span>
          ) : null}
          {reminder.title} — {text}
        </p>
        <p className="text-xs text-[#6B7280]">
          {format(parseISO(reminder.occasion_date), "d MMM")}
          {reminder.description ? ` · ${reminder.description}` : ""}
        </p>
        {!compact ? (
          <div className="mt-2 flex items-center gap-3">
            <Link
              href={reminder.action_url ?? "/gift-builder"}
              onClick={() => onAction(reminder)}
              className="text-sm font-semibold text-gold hover:underline"
            >
              Plan Gift →
            </Link>
            <button
              type="button"
              onClick={() => onDismiss(reminder.id)}
              className="text-xs text-[#9CA3AF] hover:text-[#6B7280]"
            >
              Dismiss
            </button>
          </div>
        ) : null}
      </div>
      {compact ? (
        <button
          type="button"
          onClick={() => onDismiss(reminder.id)}
          aria-label="Dismiss"
          className="self-start text-[#9CA3AF] hover:text-[#6B7280]"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
