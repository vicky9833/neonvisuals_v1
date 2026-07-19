"use client";

import { useState } from "react";
import Image from "next/image";

interface TeamAvatarProps {
  /** Portrait path (e.g. /team/shivam.png). */
  src: string;
  /** Full name — used for alt text and the initials fallback. */
  name: string;
  /** Title, for alt text. */
  title: string;
}

/** Derive up to two uppercase initials from a full name. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

/**
 * Co-founder portrait for the About team grid. Renders the photo; if it fails to
 * load (missing/renamed asset), it degrades to a branded initials monogram that
 * FILLS the circle — never raw overflowing alt text.
 */
export function TeamAvatar({ src, name, title }: TeamAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-[#1A1A2E] font-heading text-4xl font-bold text-[#C4A35A]"
        role="img"
        aria-label={`${name}, ${title} at Neon Visuals`}
      >
        {initialsOf(name)}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={`${name}, ${title} at Neon Visuals`}
      width={200}
      height={200}
      onError={() => setFailed(true)}
      className="h-full w-full object-cover object-top transition-transform duration-300 hover:scale-105"
    />
  );
}
