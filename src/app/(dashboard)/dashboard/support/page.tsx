import { HelpCircle } from "lucide-react";
import { PagePlaceholder } from "@/components/dashboard/PagePlaceholder";

export default function SupportPage() {
  return (
    <PagePlaceholder
      title="Help & Support"
      icon={<HelpCircle className="size-8" />}
      description="Reach our team on WhatsApp or email for any help with your gifting. Coming soon - this feature is being built."
      ctaLabel="Chat with us on WhatsApp"
      ctaHref="https://wa.me/919019409590"
    />
  );
}
