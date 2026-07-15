import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { buildMetadata } from "@/lib/utils/seo";

export const metadata: Metadata = buildMetadata({
  title: "Get a Quote",
  description:
    "Request a tailored quote for personalised corporate gifting. GST invoices, PO support, and enterprise credit terms.",
  path: "/get-quote",
});

export default function GetQuotePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <PageHeader
        title="Request a quote"
        description="Tell us what you're celebrating and the volume - we'll respond with a tailored proposal."
      />
    </div>
  );
}
