"use client";

import { useState } from "react";
import Image from "next/image";
import { PlaceholderImage } from "@/components/products/placeholder-image";
import { variantUrl, originalOnError } from "@/lib/utils/image-variants";

interface ProductGalleryProps {
  name: string;
  imageUrl?: string;
  galleryImages?: string[];
}

/** Product image gallery with a thumbnail strip (client island). */
export function ProductGallery({ name, imageUrl, galleryImages = [] }: ProductGalleryProps) {
  const images = imageUrl ? [imageUrl, ...galleryImages] : [];
  // Deduplicate while preserving first-seen order so duplicate URLs never
  // produce React duplicate-key warnings, out-of-bounds active indices, or
  // repeated thumbnails.
  const uniqueImages = Array.from(new Set(images));
  const [active, setActive] = useState(0);

  if (uniqueImages.length === 0) {
    return (
      <div className="relative aspect-square w-full max-w-[600px] overflow-hidden rounded-2xl">
        <PlaceholderImage name={name} />
      </div>
    );
  }

  // Clamp the active index so it can never exceed the deduplicated bounds.
  const activeIndex = Math.min(active, uniqueImages.length - 1);

  return (
    <div>
      <div className="relative aspect-square w-full max-w-[600px] overflow-hidden rounded-2xl border border-[#EDE9E3] bg-[#FAFAF8]">
        <Image
          key={uniqueImages[activeIndex]}
          src={variantUrl(uniqueImages[activeIndex], "detail")}
          alt={`${name} - view ${activeIndex + 1}`}
          fill
          unoptimized
          priority
          onError={originalOnError(uniqueImages[activeIndex])}
          className="object-contain p-6"
          sizes="(max-width: 1024px) 100vw, 55vw"
        />
      </div>

      {uniqueImages.length > 1 ? (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {uniqueImages.map((src, i) => (
            <button
              key={`${i}-${src}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === activeIndex}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-[#FAFAF8] transition-colors ${
                i === activeIndex ? "border-[#C4A35A]" : "border-[#EDE9E3] hover:border-[#C4A35A]"
              }`}
            >
              <Image
                src={variantUrl(src, "thumb")}
                alt={`${name} thumbnail ${i + 1}`}
                fill
                unoptimized
                onError={originalOnError(src)}
                className="object-contain p-1"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
