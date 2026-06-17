"use client";

import { useState } from "react";
import Image from "next/image";
import { PlaceholderImage } from "@/components/products/placeholder-image";

interface ProductGalleryProps {
  name: string;
  imageUrl?: string;
  galleryImages?: string[];
}

/** Product image gallery with a thumbnail strip (client island). */
export function ProductGallery({ name, imageUrl, galleryImages = [] }: ProductGalleryProps) {
  const images = imageUrl ? [imageUrl, ...galleryImages] : [];
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="relative aspect-3/4 overflow-hidden rounded-2xl bg-secondary">
        <PlaceholderImage name={name} />
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-3/4 overflow-hidden rounded-2xl border border-[#EDE9E3] bg-secondary">
        <Image
          key={images[active]}
          src={images[active]}
          alt={`${name} — view ${active + 1}`}
          fill
          priority
          className="object-cover transition-transform duration-500 hover:scale-105"
          sizes="(max-width: 1024px) 100vw, 55vw"
        />
      </div>

      {images.length > 1 ? (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === active}
              className={`relative aspect-square size-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                i === active ? "border-gold" : "border-transparent hover:border-[#EDE9E3]"
              }`}
            >
              <Image
                src={src}
                alt={`${name} thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
