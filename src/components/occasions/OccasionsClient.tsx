"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, List, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/occasion";
import { CalendarMonth } from "@/components/occasions/CalendarMonth";
import { CalendarList } from "@/components/occasions/CalendarList";
import { CalendarLegend } from "@/components/occasions/CalendarLegend";
import {
  OccasionFilters,
  type OccasionFilter,
} from "@/components/occasions/OccasionFilters";
import { CustomOccasionForm } from "@/components/occasions/CustomOccasionForm";

function isoRange(month: number, year: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: fmt(start), end: fmt(end) };
}

export function OccasionsClient() {
  const now = new Date();
  const [view, setView] = useState<"month" | "list">("month");
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [monthEvents, setMonthEvents] = useState<CalendarEvent[]>([]);
  const [listEvents, setListEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<OccasionFilter>("all");
  const [addOpen, setAddOpen] = useState(false);

  const loadMonth = useCallback(async () => {
    setLoading(true);
    const { start, end } = isoRange(month, year);
    const res = await fetch(`/api/occasions/calendar?start=${start}&end=${end}`);
    if (res.ok) setMonthEvents((await res.json()).data ?? []);
    setLoading(false);
  }, [month, year]);

  const loadList = useCallback(async () => {
    const res = await fetch("/api/occasions/upcoming?days=90");
    if (res.ok) setListEvents((await res.json()).data ?? []);
  }, []);

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    void loadList();
    // Trigger reminder generation on calendar load (idempotent + debounced).
    fetch("/api/reminders", { method: "POST" }).catch(() => {});
  }, [loadList]);

  function prevMonth() {
    setMonth((m) => (m === 0 ? 11 : m - 1));
    setYear((y) => (month === 0 ? y - 1 : y));
  }
  function nextMonth() {
    setMonth((m) => (m === 11 ? 0 : m + 1));
    setYear((y) => (month === 11 ? y + 1 : y));
  }

  const filteredMonth = useMemo(
    () => (filter === "all" ? monthEvents : monthEvents.filter((e) => e.type === filter)),
    [monthEvents, filter],
  );
  const filteredList = useMemo(
    () => (filter === "all" ? listEvents : listEvents.filter((e) => e.type === filter)),
    [listEvents, filter],
  );

  function refresh() {
    void loadMonth();
    void loadList();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-bold text-navy">
          Occasion Calendar
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-[#EDE9E3] p-0.5">
            <ViewToggle
              active={view === "month"}
              onClick={() => setView("month")}
              icon={<CalendarDays className="size-4" />}
              label="Month"
            />
            <ViewToggle
              active={view === "list"}
              onClick={() => setView("list")}
              icon={<List className="size-4" />}
              label="List"
            />
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/occasions/settings">
              <Settings className="size-4" /> Festivals
            </Link>
          </Button>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="bg-navy text-white hover:bg-navy/90"
          >
            <Plus className="size-4" /> Add
          </Button>
        </div>
      </div>

      <OccasionFilters value={filter} onChange={setFilter} />

      {view === "month" ? (
        <>
          <CalendarMonth
            month={month}
            year={year}
            events={filteredMonth}
            loading={loading}
            onPrev={prevMonth}
            onNext={nextMonth}
          />
          <CalendarLegend />
        </>
      ) : (
        <CalendarList events={filteredList} />
      )}

      <CustomOccasionForm
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={refresh}
      />
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-navy text-white" : "text-[#6B7280] hover:bg-secondary",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
