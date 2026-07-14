import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  INQUIRY_CTA_WHATSAPP,
  PHONE,
  WHATSAPP_NUMBER,
} from "@/lib/utils/constants";

type InquirySize = "sm" | "md" | "lg";
type InquiryVariant = "whatsapp" | "call" | "both";

interface InquiryButtonProps {
  productName?: string;
  occasion?: string;
  size?: InquirySize;
  variant?: InquiryVariant;
  className?: string;
}

const SIZE_MAP: Record<InquirySize, "sm" | "default" | "lg"> = {
  sm: "sm",
  md: "default",
  lg: "lg",
};

/** Builds the wa.me link with a context-aware prefilled message. */
function buildWhatsAppHref(productName?: string, occasion?: string): string {
  const subject = productName ? ` in ${productName}` : "";
  const forOccasion = occasion ? ` for ${occasion}` : "";
  const text = `Hi, I'm interested${subject}${forOccasion}. Please share pricing details.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

/**
 * Inquiry-first CTA. Prices are never shown publicly - this component
 * replaces all price displays on public pages with WhatsApp / call actions.
 */
export function InquiryButton({
  productName,
  occasion,
  size = "md",
  variant = "both",
  className,
}: InquiryButtonProps) {
  const btnSize = SIZE_MAP[size];
  const whatsappHref = buildWhatsAppHref(productName, occasion);

  const whatsappButton = (
    <Button
      asChild
      size={btnSize}
      className="bg-[#25D366] text-white hover:bg-[#1ebe5b]"
    >
      <Link href={whatsappHref} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="size-4" />
        {INQUIRY_CTA_WHATSAPP}
      </Link>
    </Button>
  );

  const callButton = (
    <Button asChild size={btnSize} className="bg-navy text-cream hover:bg-navy/90">
      <Link href={`tel:${PHONE.replace(/\s/g, "")}`}>
        <Phone className="size-4" />
        Call us
      </Link>
    </Button>
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {variant !== "call" ? whatsappButton : null}
      {variant !== "whatsapp" ? callButton : null}
    </div>
  );
}
