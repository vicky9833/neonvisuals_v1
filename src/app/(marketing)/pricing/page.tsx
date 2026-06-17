import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { buildMetadata } from "@/lib/utils/seo";

export const metadata: Metadata = buildMetadata({
  title: "Pricing",
  description:
    "Transparent, premium pricing for personalised corporate gifting and the Employee Intelligence Gifting System (EIGS).",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <PageHeader
        title="Pricing"
        description="Premium without apology, never wasteful. Quote-based for orders, with EIGS personalisation tiers."
      />
    </div>
  );
}
