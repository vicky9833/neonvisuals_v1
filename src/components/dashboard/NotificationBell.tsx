"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RemindersPanel } from "@/components/occasions/RemindersPanel";

export function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("/api/reminders")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (Array.isArray(body?.data)) setCount(body.data.length);
      })
      .catch(() => {});
  }, []);

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Notifications"
        className="relative rounded-full p-2 text-[#6B7280] transition-colors hover:bg-secondary hover:text-navy"
      >
        <Bell className="size-5" />
        {count > 0 ? (
          <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold leading-4 text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="mb-3 font-heading text-sm font-semibold text-navy">
          Upcoming Occasions
        </p>
        <RemindersPanel variant="dropdown" limit={5} onCountChange={setCount} />
      </PopoverContent>
    </Popover>
  );
}
