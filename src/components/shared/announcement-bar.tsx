"use client";

import { useEffect, useState } from "react";

const TAGLINES = [
  "Crafted with Intention. Remembered with Pride.",
  "Premium Personalized Gifting for Every Occasion",
  "5000+ Gifts Delivered Across India",
  "PAN India Delivery • MOQ from 10 Units",
  "Corporates • Startups • Colleges • Events",
] as const;

const ROTATE_MS = 4000;

/**
 * Top announcement bar for the sticky header. Navy background with gold text.
 * On md+ it cycles through the taglines every 4s with an opacity fade; on
 * mobile it shows only the first tagline with no animation.
 */
export function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out, swap the tagline, then fade back in.
      setVisible(false);
      const timeout = setTimeout(() => {
        setIndex((prev) => (prev + 1) % TAGLINES.length);
        setVisible(true);
      }, 300);
      return () => clearTimeout(timeout);
    }, ROTATE_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#1A1A2E] py-1.5 text-center text-xs text-[#C4A35A]">
      {/* Mobile: static first tagline, no animation */}
      <span className="block md:hidden">{TAGLINES[0]}</span>
      {/* md+: animated cycler with opacity fade */}
      <span
        className="hidden transition-opacity duration-300 md:block"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {TAGLINES[index]}
      </span>
    </div>
  );
}
