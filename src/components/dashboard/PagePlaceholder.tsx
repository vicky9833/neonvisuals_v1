"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { SetPageTitle } from "@/components/dashboard/DashboardProvider";

interface PagePlaceholderProps {
  /** Topbar title + heading. */
  title: string;
  /** Rendered icon element, e.g. <Users className="size-8" />. */
  icon: ReactNode;
  /** Optional override of the default "coming soon" copy. */
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function PagePlaceholder({
  title,
  icon,
  description = "Coming soon - this feature is being built.",
  ctaLabel = "In the meantime, browse our catalog",
  ctaHref = "/products",
}: PagePlaceholderProps) {
  return (
    <>
      <SetPageTitle title={title} />
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-[#9CA3AF]">
          {icon}
        </span>
        <h2 className="font-heading mt-5 text-2xl font-bold text-navy">
          {title}
        </h2>
        <p className="mt-2 max-w-sm text-sm text-[#6B7280]">{description}</p>
        <Link
          href={ctaHref}
          className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-gold hover:underline"
        >
          {ctaLabel} <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </>
  );
}
