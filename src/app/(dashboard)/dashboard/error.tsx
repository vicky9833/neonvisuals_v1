"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-8" />
      </span>
      <h2 className="font-heading mt-5 text-2xl font-bold text-navy">
        Something went wrong
      </h2>
      <p className="mt-2 max-w-sm text-sm text-[#6B7280]">
        {error.message || "An unexpected error occurred while loading your dashboard."}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button
          onClick={reset}
          className="rounded-lg bg-navy text-white hover:bg-navy/90"
        >
          Try Again
        </Button>
        <Button asChild variant="outline" className="rounded-lg">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    </div>
  );
}
