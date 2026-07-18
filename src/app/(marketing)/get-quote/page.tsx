import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ContactForm } from "@/components/marketing/contact-form";
import { buildMetadata } from "@/lib/utils/seo";

export const metadata: Metadata = buildMetadata({
  title: "Get a Quote",
  description:
    "Request a tailored quote for personalised corporate gifting. GST invoices, PO support, and enterprise credit terms.",
  path: "/get-quote",
});

const INTRO =
  "Tell us what you're celebrating. Share the occasion, the rough headcount, and any ideas you have in mind - we'll come back with a tailored proposal, curated options, and clear pricing. No obligation, and every quote is reviewed by a real person on our team.";

/**
 * P-fixpass #4: public Request-a-Quote. Wired to the PUBLIC lead-capture path
 * (ContactForm → POST /api/leads/capture) — the same real submission the contact
 * page uses. NOTE: the tenant 7a quote-request (/api/quotes/request) is
 * authenticated and cannot run on this anonymous public page; a public enquiry
 * is captured as a lead, which ops converts.
 */
export default function GetQuotePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <PageHeader
        title="Request a quote"
        description="Tell us what you're celebrating and the volume - we'll respond with a tailored proposal."
      />
      <p className="mt-6 text-base leading-[1.8] text-[#333333]">{INTRO}</p>
      <div className="mt-10">
        <ContactForm />
      </div>
    </div>
  );
}
