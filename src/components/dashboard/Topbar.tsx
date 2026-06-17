"use client";

import { Menu } from "lucide-react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { NotificationBell } from "@/components/dashboard/NotificationBell";

export function Topbar() {
  const { sidebarOpen, setSidebarOpen, pageTitle } = useDashboard();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#EDE9E3] bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation"
          className="rounded-md p-2 text-navy hover:bg-secondary lg:hidden"
        >
          <Menu className="size-5" />
        </button>
        <h1 className="font-heading text-lg font-semibold text-navy">
          {pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
