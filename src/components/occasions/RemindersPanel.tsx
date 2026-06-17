"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarHeart } from "lucide-react";
import type { Reminder } from "@/types/occasion";
import { ReminderCard } from "@/components/occasions/ReminderCard";

/**
 * Active reminders list. `variant="panel"` is used on the dashboard overview;
 * `variant="dropdown"` is used in the topbar notification bell.
 */
export function RemindersPanel({
  variant = "panel",
  limit,
  onCountChange,
}: {
  variant?: "panel" | "dropdown";
  limit?: number;
  onCountChange?: (count: number) => void;
}) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/reminders");
    if (res.ok) {
      const body = await res.json();
      const list = (body.data as Reminder[]) ?? [];
      setReminders(list);
      onCountChange?.(list.filter((r) => !r.is_read).length);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function dismiss(id: string) {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismissed" }),
    });
  }

  async function action(reminder: Reminder) {
    await fetch(`/api/reminders/${reminder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "actioned" }),
    });
  }

  const shown = typeof limit === "number" ? reminders.slice(0, limit) : reminders;

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary" />
        ))}
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="rounded-lg bg-secondary/60 px-4 py-8 text-center">
        <CalendarHeart className="mx-auto size-7 text-[#9CA3AF]" />
        <p className="mt-2 text-sm font-medium text-navy">
          No upcoming occasions
        </p>
        <p className="mt-1 text-xs text-[#6B7280]">
          Your team&apos;s birthdays, anniversaries, and festivals will appear
          here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {shown.map((r) => (
        <ReminderCard
          key={r.id}
          reminder={r}
          onDismiss={dismiss}
          onAction={action}
          compact={variant === "dropdown"}
        />
      ))}
      {variant === "dropdown" ? (
        <Link
          href="/dashboard/occasions"
          className="block py-1 text-center text-sm font-medium text-gold hover:underline"
        >
          View All →
        </Link>
      ) : null}
    </div>
  );
}
