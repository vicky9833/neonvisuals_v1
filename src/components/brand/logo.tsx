import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type LogoVariant = "full" | "horizontal" | "icon";
export type LogoTheme = "light" | "dark";

interface LogoProps {
  /**
   * Layout: `horizontal` (icon left, wordmark right - header/footer/sidebar),
   * `full` (icon stacked above wordmark - auth/loading/about), or `icon`
   * (mark only - mobile header/favicon).
   */
  variant?: LogoVariant;
  /**
   * `light` = gold wordmark for dark backgrounds (footer, sidebar, navy).
   * `dark` = navy "VISUALS" for light backgrounds (header on white).
   */
  theme?: LogoTheme;
  className?: string;
  /** Render as a plain element instead of a link to home. */
  asLink?: boolean;
  /** Icon height in px. Defaults per variant (header 36, full 80). */
  iconSize?: number;
}

const GOLD = "#C4A35A";
const NAVY = "#1A1A2E";
const LOGO_SRC = "/neon-visuals-logo.svg";

/**
 * Neon Visuals logo lockup. The gift-in-hands mark is rendered from
 * `/neon-visuals-logo.svg` via next/image; the "NEON VISUALS" wordmark is set
 * in Space Grotesk, uppercase, wide tracking - "NEON" always gold, "VISUALS"
 * gold on the light theme (dark backgrounds) and navy on the dark theme
 * (light backgrounds).
 */
export function Logo({
  variant = "horizontal",
  theme = "dark",
  className,
  asLink = true,
  iconSize,
}: LogoProps) {
  const size = iconSize ?? (variant === "full" ? 80 : 36);
  const visualsColor = theme === "light" ? GOLD : NAVY;

  const isStacked = variant === "full";

  const mark = (
    <Image
      src={LOGO_SRC}
      alt="Neon Visuals"
      width={size}
      height={size}
      priority
      unoptimized
      className="shrink-0 object-contain"
      style={{ height: size, width: "auto", maxHeight: size }}
    />
  );

  const wordmark = (
    <span
      className={cn(
        "font-[family-name:var(--font-numbers)] font-bold uppercase leading-none tracking-[0.15em]",
        !isStacked && "text-lg",
      )}
      style={isStacked ? { fontSize: Math.max(14, Math.round(size * 0.42)) } : undefined}
    >
      <span style={{ color: GOLD }}>NEON</span>{" "}
      <span style={{ color: visualsColor }}>VISUALS</span>
    </span>
  );

  let content: React.ReactNode;
  if (variant === "icon") {
    content = <span className="inline-flex items-center">{mark}</span>;
  } else if (variant === "full") {
    content = (
      <span className="inline-flex flex-col items-center gap-3">
        {mark}
        {wordmark}
      </span>
    );
  } else {
    content = (
      <span className="inline-flex items-center gap-2">
        {mark}
        {wordmark}
      </span>
    );
  }

  const wrapped = <span className={cn("inline-flex", className)}>{content}</span>;

  if (!asLink) return wrapped;

  return (
    <Link href="/" aria-label="Neon Visuals home" className={cn("inline-flex", className)}>
      {content}
    </Link>
  );
}
