"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Labels cycled in the hero pill, in order. Loops infinitely. */
const LABELS = [
  "Premium Gifting Studio",
  "Startups Merchandise",
  "Corporate Gifting",
  "College and School Events",
  "Conference Merchandise",
  "Awards & Recognition",
  "Festive Gifts",
  "NEON VISUALS - REIMAGINING GIFTING",
] as const;

/** The widest label, rendered invisibly to reserve a stable pill width. */
const WIDEST_LABEL = LABELS.reduce((a, b) => (b.length > a.length ? b : a));

const INTERVAL_MS = 3000;

/**
 * Hero pill badge that cycles through {@link LABELS} every 3 seconds. The
 * outgoing label slides up and fades out while the incoming label slides up
 * from below and fades in. The container is `overflow-hidden` with a fixed
 * height so the animation never shifts page layout. The gold sparkle icon is
 * kept before the text.
 */
export function HeroBadge() {
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((cur) => {
        setPrev(cur);
        return (cur + 1) % LABELS.length;
      });
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="hero-anim-heading inline-flex h-9 items-center gap-2 overflow-hidden rounded-full border border-gold/40 bg-gold/10 px-4 text-[13px] font-semibold text-navy">
      <span className="text-gold" aria-hidden="true">
        ✦
      </span>
      <span
        className="relative block h-5 overflow-hidden"
        aria-live="polite"
      >
        {/* Invisible sizer reserves width so the pill never resizes. */}
        <span className="invisible block whitespace-nowrap" aria-hidden="true">
          {WIDEST_LABEL}
        </span>

        {/* Outgoing label slides up and fades out. */}
        {prev !== null && prev !== index && (
          <span
            key={`out-${prev}`}
            aria-hidden="true"
            className="hero-badge-out absolute inset-0 flex items-center whitespace-nowrap"
          >
            {LABELS[prev]}
          </span>
        )}

        {/* Incoming (current) label slides up from below and fades in. */}
        <span
          key={`in-${index}`}
          className={cn(
            "absolute inset-0 flex items-center whitespace-nowrap",
            prev !== null && "hero-badge-in",
          )}
        >
          {LABELS[index]}
        </span>
      </span>
    </span>
  );
}
