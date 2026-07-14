import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { buildMetadata } from "@/lib/utils/seo";

export const metadata: Metadata = buildMetadata({
  title: "Get Started",
  description:
    "Begin your Neon Visuals journey - pick an occasion, build a kit, and request a quote.",
  path: "/get-started",
});

export default function GetStartedPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <PageHeader
        title="Get started"
        description="Tell us the moment you want to celebrate and we'll do the rest."
      />
    </div>
  );
}
