"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { SidebarBody } from "@/components/dashboard/Sidebar";

/** Mobile/tablet slide-in drawer (below lg). Driven by dashboard context. */
export function MobileSidebar() {
  const { profile, company, sidebarOpen, setSidebarOpen } = useDashboard();
  const pathname = usePathname();

  // Close on route change.
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  // Close on ESC + lock body scroll while open.
  useEffect(() => {
    if (!sidebarOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [sidebarOpen, setSidebarOpen]);

  return (
    <div
      className={cn(
        "lg:hidden",
        sidebarOpen ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!sidebarOpen}
    >
      {/* Backdrop */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200",
          sidebarOpen ? "opacity-100" : "opacity-0",
        )}
      />
      {/* Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-200 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard navigation"
      >
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
          className="absolute right-3 top-4 z-10 rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="size-5" />
        </button>
        <SidebarBody
          role={profile.role}
          companyName={company?.name ?? "Your Company"}
          onNavigate={() => setSidebarOpen(false)}
        />
      </aside>
    </div>
  );
}
