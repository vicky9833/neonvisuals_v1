"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/**
 * In-app notification bell (Prompt 6a). Reads the user's OWN `notifications`
 * (RLS-scoped via /api/notifications) — unread-first — with an unread badge and
 * mark-as-read. Replaces the prior mis-wired version that read the reminders
 * (email-dispatch) table.
 */
export function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications?limit=20");
      if (!r.ok) return;
      const body = await r.json();
      setItems(Array.isArray(body?.data) ? body.data : []);
      setUnread(typeof body?.unread === "number" ? body.unread : 0);
    } catch {
      /* non-blocking */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read" }),
    }).catch(() => {});
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnread(0);
    await fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
  }

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Notifications"
        className="relative rounded-full p-2 text-[#6B7280] transition-colors hover:bg-secondary hover:text-navy"
      >
        <Bell className="size-5" />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-heading text-sm font-semibold text-navy">Notifications</p>
          {unread > 0 ? (
            <button
              onClick={markAllRead}
              className="text-xs font-medium text-gold hover:underline"
            >
              Mark all read
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-secondary" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg bg-secondary/60 px-4 py-8 text-center">
            <Bell className="mx-auto size-7 text-[#9CA3AF]" />
            <p className="mt-2 text-sm font-medium text-navy">You&apos;re all caught up</p>
            <p className="mt-1 text-xs text-[#6B7280]">
              Occasion reminders and team updates will appear here.
            </p>
          </div>
        ) : (
          <ul className="max-h-96 space-y-1 overflow-y-auto">
            {items.map((n) => {
              const inner = (
                <div
                  className={`rounded-lg px-3 py-2 transition-colors hover:bg-secondary ${
                    n.read_at ? "opacity-60" : "bg-secondary/40"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read_at ? (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gold" />
                    ) : (
                      <span className="mt-1.5 size-2 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-navy">{n.title}</p>
                      {n.body ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-[#6B7280]">{n.body}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
              return (
                <li key={n.id} onClick={() => (n.read_at ? undefined : markRead(n.id))}>
                  {n.link ? (
                    <Link href={n.link} onClick={() => markRead(n.id)}>
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
