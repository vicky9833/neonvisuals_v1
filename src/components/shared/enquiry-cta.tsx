/**
 * EnquiryCTA - WhatsApp (primary) + Call + Email actions for a product.
 * Server-rendered; all links pre-fill product context. NO prices.
 */
import { MessageCircle, Phone, Mail } from "lucide-react";
import type { Product } from "@/lib/types/product";
import { waProduct } from "@/lib/catalog";
import { WHATSAPP_NUMBER, SUPPORT_EMAIL } from "@/lib/utils/constants";

export function EnquiryCTA({
  product,
  collectionName,
}: {
  product: Product;
  collectionName: string;
}) {
  const wa = waProduct(product, collectionName);
  const tel = `tel:+${WHATSAPP_NUMBER}`;
  const mail = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `Enquiry: ${product.name}`,
  )}&body=${encodeURIComponent(
    `Hi, I'd like to know more about ${product.name} (${product.sku}).`,
  )}`;

  return (
    <div className="space-y-3">
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-4 text-lg font-semibold text-white transition-all duration-200 hover:scale-[1.01] hover:bg-navy/90"
      >
        <MessageCircle className="size-5" /> Enquire About This Gift
      </a>
      <div className="grid grid-cols-2 gap-3">
        <a
          href={tel}
          className="flex items-center justify-center gap-2 rounded-xl border border-[#EDE9E3] py-3 text-sm font-semibold text-navy transition-colors hover:bg-secondary"
        >
          <Phone className="size-4" /> Call Us
        </a>
        <a
          href={mail}
          className="flex items-center justify-center gap-2 rounded-xl border border-[#EDE9E3] py-3 text-sm font-semibold text-navy transition-colors hover:bg-secondary"
        >
          <Mail className="size-4" /> Email Us
        </a>
      </div>
      <p className="text-xs leading-relaxed text-[#888888]">
        ✓ No commitment required · ✓ Response within 2 hours · ✓ Free sample
        available for orders 25+
      </p>
    </div>
  );
}
