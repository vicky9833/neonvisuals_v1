import { cn } from "@/lib/utils";

interface NeonGlowProps {
  children: React.ReactNode;
  className?: string;
  /** Enables the continuous gold glow pulse animation. */
  animated?: boolean;
}

/**
 * Wraps content in a subtle gold glow — used sparingly for hero accents
 * and featured elements.
 */
export function NeonGlow({ children, className, animated = false }: NeonGlowProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-card",
        animated ? "animate-glow" : "shadow-warm",
        className,
      )}
    >
      {children}
    </span>
  );
}
