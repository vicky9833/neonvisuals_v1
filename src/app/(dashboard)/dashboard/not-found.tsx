import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-[#9CA3AF]">
        <Compass className="size-8" />
      </span>
      <h2 className="font-heading mt-5 text-2xl font-bold text-navy">
        Page not found
      </h2>
      <p className="mt-2 max-w-sm text-sm text-[#6B7280]">
        We couldn&apos;t find the page you were looking for.
      </p>
      <Button
        asChild
        className="mt-6 rounded-lg bg-navy text-white hover:bg-navy/90"
      >
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  );
}
