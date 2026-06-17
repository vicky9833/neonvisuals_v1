/**
 * StickyMobileCTA — fixed bottom enquiry bar shown only on mobile for the
 * product detail page. Server-rendered (plain link). NO prices.
 */
import { MessageCircle } from "lucide-react";

export function StickyMobileCTA({ href, label = "Enquire About This Gift" }: { href: string; label?: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#EDE9E3] bg-background/95 p-3 backdrop-blur-md md:hidden">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-3.5 text-base font-semibold text-white"
      >
        <MessageCircle className="size-5" /> {label}
      </a>
    </div>
  );
}
