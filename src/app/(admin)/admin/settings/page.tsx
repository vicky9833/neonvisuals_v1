import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { getSettings } from "@/lib/admin/settings";
import { isRazorpayConfigured } from "@/lib/services/razorpay";

export const metadata: Metadata = { title: "Settings" };

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return (
    <div className="space-y-8">
      <PageHeader
        title="System Settings"
        description="Platform-wide configuration for Neon Visuals."
      />
      <AdminSettings initial={settings} razorpayConfigured={isRazorpayConfigured()} />
    </div>
  );
}
