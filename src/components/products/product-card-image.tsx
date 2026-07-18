"use client";

import { useState } from "react";
import Image from "next/image";
import { PlaceholderImage } from "@/components/products/placeholder-image";

interface ProductCardImageProps {
  /** Absolute or root-relative image URL. */
  imageUrl?: string;
  /** Product name - used for alt text and the placeholder label. */
  name: string;
}

/**
 * Client-only image area for {@link ProductCard}. Renders a warm pulsing
 * skeleton while the image loads, fades the image in on load, and falls back
 * to the branded {@link PlaceholderImage} on error or when no image is set.
 * Returns a fragment so the <Image> stays a direct child of the card's
 * aspect-square container.
 */
export function ProductCardImage({ imageUrl, name }: ProductCardImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (!imageUrl || errored) {
    return <PlaceholderImage name={name} />;
  }

  return (
    <>
      {!loaded ? (
        <div
          className="absolute inset-0 animate-pulse bg-[#EDE9E3]"
          aria-hidden="true"
        />
      ) : null}
      <Image
        src={imageUrl}
        alt={`${name} - personalised corporate gift`}
        fill
        unoptimized
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={`object-contain p-3 transition-all duration-300 group-hover:scale-105 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
      />
    </>
  );
}
