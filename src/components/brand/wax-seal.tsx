import { cn } from "@/lib/utils";

interface WaxSealProps {
  className?: string;
  /** Optional monogram or short label shown in the seal center. */
  label?: string;
  size?: number;
}

/**
 * Decorative burgundy wax seal - a signature Neon Visuals brand element
 * signalling ceremony and craft.
 */
export function WaxSeal({ className, label = "NV", size = 64 }: WaxSealProps) {
  return (
    <span
      role="img"
      aria-label="Wax seal"
      className={cn(
        "inline-flex items-center justify-center rounded-full text-cream shadow-warm",
        className,
      )}
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 35% 30%, #9c3b46 0%, #7c2d36 55%, #5e2129 100%)",
      }}
    >
      <span
        className="font-heading font-semibold"
        style={{ fontSize: size * 0.32 }}
      >
        {label}
      </span>
    </span>
  );
}
