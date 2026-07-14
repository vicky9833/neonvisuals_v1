import { Gift } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Branded fallback shown when a product has no real image.
 * Centered gift icon on a warm neutral surface (#FAFAF8) with a warm
 * border (#EDE9E3). Fills its relatively-positioned parent via
 * `absolute inset-0`. Server-safe - no client JS.
 */
interface PlaceholderImageProps {
  name: string;
  className?: string;
}

export function PlaceholderImage({ name, className }: PlaceholderImageProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-4 border bg-[#FAFAF8] border-[#EDE9E3]",
        className,
      )}
      role="img"
      aria-label={`${name} - image coming soon`}
    >
      <Gift className="h-1/4 w-1/4 text-gold" strokeWidth={1.5} aria-hidden="true" />
      <span className="line-clamp-2 max-w-[80%] px-4 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {name}
      </span>
    </div>
  );
}
