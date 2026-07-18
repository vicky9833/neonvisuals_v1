"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface HeroCarouselProps {
  /** Ordered image URLs to showcase. */
  images: string[];
  /** Rotation interval in milliseconds. */
  intervalMs?: number;
}

/**
 * Auto-rotating hero image showcase. Crossfades between images every few
 * seconds (current fades out, next fades in), pausing while hovered. Position
 * is shown by gold/gray dot indicators; there are no arrow controls. The first
 * two images are given `priority` so the initial frame loads eagerly.
 */
export function HeroCarousel({ images, intervalMs = 4000 }: HeroCarouselProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || images.length <= 1) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [paused, images.length, intervalMs]);

  if (images.length === 0) return null;

  return (
    <div
      className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl border border-[#EDE9E3] bg-[#FAFAF8] shadow-2xl md:aspect-[4/5]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {images.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={`Neon Visuals premium gifting showcase ${i + 1}`}
          fill
          unoptimized
          priority={i < 2}
          sizes="(max-width: 1024px) 100vw, 45vw"
          className={cn(
            "object-cover transition-opacity duration-700 ease-out",
            i === active ? "opacity-100" : "opacity-0",
          )}
        />
      ))}

      {/* Dot indicators (gold = active, gray = inactive), centered. */}
      <div className="absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-2">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            aria-label={`Show showcase image ${i + 1}`}
            aria-current={i === active}
            onClick={() => setActive(i)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === active
                ? "w-6 bg-[#C4A35A]"
                : "w-2 bg-white/60 hover:bg-white/90",
            )}
          />
        ))}
      </div>
    </div>
  );
}
