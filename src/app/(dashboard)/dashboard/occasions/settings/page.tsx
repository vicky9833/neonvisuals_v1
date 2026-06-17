import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SetPageTitle } from "@/components/dashboard/DashboardProvider";
import { FestivalSettings } from "@/components/occasions/FestivalSettings";

export default function FestivalSettingsPage() {
  return (
    <div className="space-y-6">
      <SetPageTitle title="Festival & Holiday Settings" />
      <div>
        <Link
          href="/dashboard/occasions"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#6B7280] hover:text-navy"
        >
          <ArrowLeft className="size-4" /> Back to Calendar
        </Link>
        <h1 className="font-heading mt-3 text-2xl font-bold text-navy">
          Festival &amp; Holiday Settings
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[#6B7280]">
          Choose which festivals and holidays your company observes. We&apos;ll
          add them to your calendar and remind you to plan gifting.
        </p>
      </div>
      <FestivalSettings />
    </div>
  );
}
