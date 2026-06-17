"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  to: number;
  /** Decimal places to render (e.g. 1 for 4.9). */
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Duration in ms. */
  duration?: number;
  className?: string;
}

/** Counts up from 0 to `to` once it scrolls into view (ease-out). */
export function CountUp({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 2000,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let start = 0;

    const animate = (now: number) => {
      if (!start) start = now;
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(to * eased);
      if (progress < 1) raf = requestAnimationFrame(animate);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          raf = requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
