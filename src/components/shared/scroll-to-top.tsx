"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

/**
 * Floating "scroll to top" button. Appears after the viewport is scrolled
 * more than 500px and smooth-scrolls back to the top on click. Pinned just
 * above the WhatsApp float. Fades in/out via an opacity transition and drops
 * pointer events while hidden. Carries a `scroll-to-top` class so the print
 * stylesheet can hide it.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={`scroll-to-top fixed right-4 bottom-16 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#1A1A2E] text-white shadow-lg shadow-black/20 transition-opacity duration-300 ease-out hover:bg-[#25253f] focus-visible:opacity-100 md:right-6 md:bottom-20 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <ChevronUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
