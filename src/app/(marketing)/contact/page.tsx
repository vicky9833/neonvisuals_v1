import type { Metadata } from "next";
import { Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { InquiryButton } from "@/components/shared/inquiry-button";
import { buildMetadata } from "@/lib/utils/seo";
import { PHONE, SUPPORT_EMAIL } from "@/lib/utils/constants";

export const metadata: Metadata = buildMetadata({
  title: "Contact",
  description:
    "Talk to the Neon Visuals team about onboarding kits, anniversaries, festive gifting, and client appreciation. WhatsApp or call 9019409590.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <PageHeader
        title="Let's talk"
        description="Tell us what you're celebrating and we'll help you make it memorable."
      />

      <div className="mt-8 space-y-4">
        <a
          href={`tel:${PHONE.replace(/\s/g, "")}`}
          className="flex items-center gap-3 text-foreground"
        >
          <Phone className="size-5 text-gold" />
          {PHONE}
        </a>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="flex items-center gap-3 text-foreground"
        >
          <Mail className="size-5 text-gold" />
          {SUPPORT_EMAIL}
        </a>
      </div>

      <div className="mt-8">
        <InquiryButton variant="both" size="lg" />
      </div>
    </div>
  );
}
