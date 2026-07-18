"use client";

import { useState } from "react";
import Image from "next/image";
import { blogFallbackImage } from "./blog-fallback-images";

interface BlogHeroImageProps {
  /** DB hero image URL; may be null/empty. */
  src: string | null | undefined;
  alt: string;
  /** Post slug, used to derive a stable, varied fallback when needed. */
  slug: string;
}

/**
 * Detail-page hero image. Uses the DB `hero_image_url` when present; if it is
 * missing or fails to load, it falls back to a real premium product photo
 * (chosen deterministically from the post slug) rather than an empty box.
 */
export function BlogHeroImage({ src, alt, slug }: BlogHeroImageProps) {
  const [heroFailed, setHeroFailed] = useState(false);
  const hasHero = Boolean(src?.trim());
  const showHero = hasHero && !heroFailed;
  const finalSrc = showHero ? (src as string) : blogFallbackImage(slug);

  return (
    <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-2xl bg-secondary">
      <Image
        src={finalSrc}
        alt={alt}
        fill
        unoptimized
        priority
        sizes="(max-width: 768px) 100vw, 768px"
        className="object-cover"
        onError={() => {
          if (showHero) setHeroFailed(true);
        }}
      />
    </div>
  );
}
