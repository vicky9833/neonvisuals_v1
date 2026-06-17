"use client";

import { useState } from "react";

export interface Notification {
  id: string;
  title: string;
  body?: string;
  read: boolean;
  createdAt: string;
}

/**
 * Provides in-app notifications (occasion reminders, order updates). Wired
 * to Supabase Realtime in a dedicated task; returns a placeholder for now.
 */
export function useNotifications() {
  const [notifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;
  return { notifications, unreadCount };
}
