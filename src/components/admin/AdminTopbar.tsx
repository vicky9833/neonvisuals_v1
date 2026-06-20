"use client";

import Link from "next/link";
import { Menu, ExternalLink } from "lucide-react";
import { useAdmin } from "./AdminProvider";

export function AdminTopbar() {
  const { sidebarOpen, setSidebarOpen, pageTitle, profile } = useAdmin();

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

      <div className="flex items-center gap-3">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-1.5 text-sm font-medium text-[#6B7280] hover:text-navy sm:inline-flex"
        >
          <ExternalLink className="size-4" /> Visit site
        </a>
        <Link
          href="/dashboard"
          className="flex size-9 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white"
          title={profile.full_name}
        >
          {profile.full_name?.slice(0, 1).toUpperCase() ?? "A"}
        </Link>
      </div>
    </header>
  );
}
