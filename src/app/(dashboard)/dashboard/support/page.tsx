import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ConciergeWidget } from "@/components/concierge/ConciergeWidget";

export const metadata: Metadata = {
  title: "Help & Support",
  description: "Talk to your dedicated gifting manager.",
  robots: { index: false, follow: false },
};

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Help & Support"
        description="Your dedicated gifting concierge — ask anything, attach references, and we'll take it from there."
      />
      <ConciergeWidget />
    </div>
  );
}
